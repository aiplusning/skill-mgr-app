import { cpSync, existsSync, lstatSync, mkdirSync, readlinkSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { sqlite } from './db'

export type InstallMode = 'symlink' | 'copy'
export type InstallStatus = 'installed' | 'missing' | 'not_installed'

export class InstallerError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) {
    super(message)
    this.name = 'InstallerError'
  }
}

type Skill = { id: string; slug: string; dir_path: string }
type Tool = { id: string; global_path: string; enabled: number | null }
type InstallRecord = { install_mode: InstallMode; installed_path: string | null }

export function expandHome(input: string): string {
  if (input === '~') return os.homedir()
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2))
  return input
}

// T13 records installation state in the existing relation table, without adding a new table.
function ensureInstallColumns(): void {
  const columns = sqlite.prepare("PRAGMA table_info('skill_tools')").all() as Array<{ name: string }>
  if (!columns.some((column) => column.name === 'install_mode')) {
    sqlite.exec('ALTER TABLE skill_tools ADD COLUMN install_mode TEXT')
  }
  if (!columns.some((column) => column.name === 'installed_path')) {
    sqlite.exec('ALTER TABLE skill_tools ADD COLUMN installed_path TEXT')
  }
}

function loadSkillAndTool(skillId: string, toolId: string): { skill: Skill; tool: Tool } {
  ensureInstallColumns()
  const skill = sqlite.prepare('SELECT id, slug, dir_path FROM skills WHERE id = ?').get(skillId) as Skill | undefined
  if (!skill) throw new InstallerError('SKILL_NOT_FOUND', 'Skill not found', 404)
  const tool = sqlite.prepare('SELECT id, global_path, enabled FROM tools WHERE id = ?').get(toolId) as Tool | undefined
  if (!tool) throw new InstallerError('TOOL_NOT_FOUND', 'Tool not found', 404)
  return { skill, tool }
}

function resolveInstallTarget(skill: Skill, tool: Tool): { source: string; directory: string; target: string } {
  if (!/^[a-zA-Z0-9._-]+$/.test(skill.slug) || skill.slug === '.' || skill.slug === '..') {
    throw new InstallerError('INVALID_SLUG', 'Skill slug is not safe for installation')
  }
  const source = realpathSync(skill.dir_path)
  const configuredRoot = path.resolve(expandHome(tool.global_path))
  mkdirSync(configuredRoot, { recursive: true })
  const directory = realpathSync(configuredRoot)
  const target = path.resolve(directory, skill.slug)
  if (path.dirname(target) !== directory) throw new InstallerError('INVALID_TARGET', 'Install target escaped its configured directory')
  return { source, directory, target }
}

export function status(skillId: string, toolId: string): { status: InstallStatus; installed_path: string | null; install_mode: InstallMode | null } {
  const { skill } = loadSkillAndTool(skillId, toolId)
  const record = sqlite.prepare('SELECT install_mode, installed_path FROM skill_tools WHERE skill_id = ? AND tool_id = ?').get(skillId, toolId) as InstallRecord | undefined
  if (!record) return { status: 'not_installed', installed_path: null, install_mode: null }
  const installedPath = record.installed_path || null
  return {
    status: installedPath && existsSync(installedPath) ? 'installed' : 'missing',
    installed_path: installedPath,
    install_mode: record.install_mode,
  }
}

export function install(skillId: string, toolId: string, mode: InstallMode) {
  if (mode !== 'symlink' && mode !== 'copy') throw new InstallerError('INVALID_MODE', "mode must be 'symlink' or 'copy'")
  const { skill, tool } = loadSkillAndTool(skillId, toolId)
  if (!tool.enabled) throw new InstallerError('TOOL_DISABLED', 'This tool is disabled', 400)
  const { source, target } = resolveInstallTarget(skill, tool)
  const record = sqlite.prepare('SELECT install_mode, installed_path FROM skill_tools WHERE skill_id = ? AND tool_id = ?').get(skillId, toolId) as InstallRecord | undefined

  if (record?.installed_path && existsSync(record.installed_path)) {
    if (path.resolve(record.installed_path) !== target) throw new InstallerError('INSTALL_PATH_CHANGED', 'Existing installation is recorded at a different path; uninstall it before changing tool paths', 409)
    throw new InstallerError('ALREADY_INSTALLED', 'Skill is already installed for this tool', 409)
  }
  if (existsSync(target)) throw new InstallerError('TARGET_EXISTS', 'Install target already exists and is not managed by this application', 409)

  try {
    if (mode === 'symlink') symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir')
    else cpSync(source, target, { recursive: true, errorOnExist: true, force: false })
  } catch (error) {
    throw new InstallerError('INSTALL_FAILED', error instanceof Error ? error.message : 'Unable to install Skill', 500)
  }

  const save = sqlite.transaction(() => {
    sqlite.prepare(`
      INSERT INTO skill_tools (skill_id, tool_id, install_mode, installed_path)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(skill_id, tool_id) DO UPDATE SET install_mode = excluded.install_mode, installed_path = excluded.installed_path
    `).run(skillId, toolId, mode, target)
    sqlite.prepare('UPDATE skills SET install_count = COALESCE(install_count, 0) + 1 WHERE id = ?').run(skillId)
  })
  try { save() } catch (error) {
    try { rmSync(target, { recursive: true, force: true }) } catch { /* Keep the original database error. */ }
    throw error
  }
  return { skill_id: skillId, tool_id: toolId, mode, installed_path: target, status: 'installed' as const }
}

export function uninstall(skillId: string, toolId: string) {
  const { skill } = loadSkillAndTool(skillId, toolId)
  const record = sqlite.prepare('SELECT install_mode, installed_path FROM skill_tools WHERE skill_id = ? AND tool_id = ?').get(skillId, toolId) as InstallRecord | undefined
  if (!record || !record.installed_path || !record.install_mode) throw new InstallerError('NOT_MANAGED', 'No managed installation record exists', 404)

  const installedPath = path.resolve(record.installed_path)
  if (existsSync(installedPath)) {
    const info = lstatSync(installedPath)
    if (record.install_mode === 'symlink') {
      if (!info.isSymbolicLink()) throw new InstallerError('INSTALL_PATH_CHANGED', 'Recorded symlink path is no longer a symlink; refusing to remove it', 409)
      const linkTarget = path.resolve(path.dirname(installedPath), readlinkSync(installedPath))
      if (linkTarget !== path.resolve(skill.dir_path)) throw new InstallerError('INSTALL_PATH_CHANGED', 'Symlink no longer points to this Skill; refusing to remove it', 409)
      rmSync(installedPath)
    } else {
      if (info.isSymbolicLink() || !info.isDirectory()) throw new InstallerError('INSTALL_PATH_CHANGED', 'Recorded copy path was replaced; refusing to remove it', 409)
      rmSync(installedPath, { recursive: true, force: false })
    }
  }

  sqlite.prepare('DELETE FROM skill_tools WHERE skill_id = ? AND tool_id = ?').run(skill.id, toolId)
  return { skill_id: skillId, tool_id: toolId, removed_path: installedPath, status: 'not_installed' as const }
}

export function getInstallationStatus(skillId: string, toolId: string) {
  const { skill, tool } = loadSkillAndTool(skillId, toolId)
  const result = status(skillId, toolId)
  return { ...result, slug: skill.slug, tool_id: tool.id }
}

export function createInstallRecordId(): string {
  return randomUUID()
}
