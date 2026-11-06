import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, realpathSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { parse, validateNameMatchesSlug } from './frontmatter'
import { isUnderRoot, resolveUnderRoots, writeUnderDir, writeUnderRoots } from './fs-safe'
import { sqlite } from './db'

export type SaveMode = 'file' | 'draft' | 'export'

export interface SaveSkillInput {
  skill: { id: string; slug: string; dir_path: string }
  content: string
  mode: SaveMode
  options?: { note?: string; targetDir?: string }
}

export class SaveSkillError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) {
    super(message)
    this.name = 'SaveSkillError'
  }
}

/** One dispatch point for all supported Skill save modes. */
export function saveSkill({ skill, content, mode, options = {} }: SaveSkillInput) {
  if (typeof content !== 'string') throw new SaveSkillError('INVALID_CONTENT', 'content must be a string')

  if (mode === 'draft') {
    const versionId = randomUUID()
    sqlite.prepare('INSERT INTO skill_versions (id, skill_id, content, note) VALUES (?, ?, ?, ?)')
      .run(versionId, skill.id, content, options.note?.trim() || null)
    return { mode, version_id: versionId }
  }

  if (mode === 'export') {
    if (!options.targetDir) throw new SaveSkillError('INVALID_TARGET_DIR', 'targetDir is required')
    const outputPath = writeUnderDir(options.targetDir, skill.slug, content)
    return { mode, path: outputPath }
  }

  if (mode === 'file') {
    const parsed = parse(content)
    if (parsed.error) throw new SaveSkillError('INVALID_FRONTMATTER', parsed.error, 422)
    const validation = validateNameMatchesSlug(parsed.data, skill.slug)
    if (!validation.ok) throw new SaveSkillError('NAME_MISMATCH', validation.reason || 'frontmatter name must match Skill slug', 422)

    const root = path.resolve(skill.dir_path)
    const target = writeUnderRoots(path.join(root, 'SKILL.md'), content, [root])
    const fileHash = createHash('sha256').update(content).digest('hex')
    const fileMtime = Math.floor(statSync(target).mtimeMs)
    const updated = sqlite.prepare(`
      UPDATE skills
      SET frontmatter = ?, body = ?, name = ?, description = ?, file_hash = ?, file_mtime = ?, status = 'ok', updated_at = MAX(unixepoch(), updated_at + 1)
      WHERE id = ?
    `).run(parsed.frontmatter, parsed.content, String(parsed.data.name), typeof parsed.data.description === 'string' ? parsed.data.description : null, fileHash, fileMtime, skill.id)
    if (updated.changes === 0) throw new SaveSkillError('SKILL_NOT_FOUND', 'Skill not found', 404)
    const row = sqlite.prepare('SELECT updated_at FROM skills WHERE id = ?').get(skill.id) as { updated_at: number }
    return { mode, updated_at: Number(row.updated_at) }
  }

  throw new SaveSkillError('INVALID_MODE', `Unsupported save mode: ${mode}`)
}

// Keep these imports exercised here as a reminder that paths are verified at the filesystem boundary.
void mkdirSync
void realpathSync
void isUnderRoot
void resolveUnderRoots
