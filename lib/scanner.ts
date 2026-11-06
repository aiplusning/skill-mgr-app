import { createHash, randomUUID } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { sqlite } from './db'
import { isUnderRoot } from './fs-safe'
import type { ScanError, ScanResult } from './types'

const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', '.next', 'data', '.venv'])
const SKILL_FILE = 'SKILL.md'

function expandHome(input: string): string {
  if (input === '~') return process.env.HOME || input
  if (input.startsWith('~/')) return path.join(process.env.HOME || input, input.slice(2))
  return input
}

function listSkillFiles(directory: string, found: string[], errors: ScanError[]): void {
  let entries
  try {
    entries = readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    errors.push({ path: directory, message: error instanceof Error ? error.message : 'Unable to read directory' })
    return
  }

  const skillFile = entries.find((entry) => entry.isFile() && entry.name === SKILL_FILE)
  if (skillFile) {
    found.push(path.join(directory, SKILL_FILE))
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(entry.name)) continue
    listSkillFiles(path.join(directory, entry.name), found, errors)
  }
}

function rawFrontmatter(content: string): string | null {
  const match = content.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
  return match?.[1] ?? null
}

/** Scan configured roots synchronously and upsert Skill metadata into SQLite. */
export function scanSkills(inputRoots: string[]): ScanResult {
  const roots = [...new Set(inputRoots.map((root) => path.resolve(expandHome(root))))]
  const errors: ScanError[] = []
  const invalid: ScanError[] = []
  const files: string[] = []

  for (const root of roots) {
    try {
      if (statSync(root).isDirectory()) listSkillFiles(root, files, errors)
      else errors.push({ path: root, message: 'Scan root is not a directory' })
    } catch (error) {
      errors.push({ path: root, message: error instanceof Error ? error.message : 'Scan root does not exist' })
    }
  }

  const seenDirectories = new Set<string>()
  let ok = 0
  let changed = 0
  let unchanged = 0

  const findByDirectory = sqlite.prepare('SELECT id, file_hash FROM skills WHERE dir_path = ?')
  const upsert = sqlite.prepare(`
    INSERT INTO skills (
      id, slug, name, description, frontmatter, body, dir_path, source,
      file_mtime, file_hash, status, updated_at
    ) VALUES (
      @id, @slug, @name, @description, @frontmatter, @body, @dirPath, 'local',
      @fileMtime, @fileHash, @status, unixepoch()
    )
    ON CONFLICT(dir_path) DO UPDATE SET
      slug = excluded.slug,
      name = excluded.name,
      description = excluded.description,
      frontmatter = excluded.frontmatter,
      body = excluded.body,
      file_mtime = excluded.file_mtime,
      file_hash = excluded.file_hash,
      status = excluded.status,
      updated_at = MAX(unixepoch(), skills.updated_at + 1)
  `)

  const scanTransaction = sqlite.transaction(() => {
    for (const filePath of files) {
      const directory = path.dirname(filePath)
      seenDirectories.add(directory)
      try {
        const content = readFileSync(filePath, 'utf8')
        const parsed = matter(content)
        const data = parsed.data as Record<string, unknown>
        const slug = path.basename(directory)
        const name = typeof data.name === 'string' ? data.name.trim() : ''
        const description = typeof data.description === 'string' ? data.description.trim() : ''
        const status = name && description ? 'ok' : 'invalid'
        const hash = createHash('sha256').update(content).digest('hex')
        const stat = statSync(filePath)
        const previous = findByDirectory.get(directory) as { id: string; file_hash: string | null } | undefined

        if (status === 'ok') ok += 1
        else {
          const reasons = [!name && 'frontmatter 缺少 name', !description && 'frontmatter 缺少 description'].filter(Boolean)
          invalid.push({ path: filePath, message: reasons.join('；') })
        }

        if (previous?.file_hash === hash) {
          unchanged += 1
          continue
        }

        upsert.run({
          id: previous?.id ?? randomUUID(),
          slug,
          // The schema requires a name; invalid records use their directory slug as a safe display fallback.
          name: name || slug,
          description: description || null,
          frontmatter: rawFrontmatter(content),
          body: parsed.content.trimStart(),
          dirPath: directory,
          fileMtime: Math.floor(stat.mtimeMs),
          fileHash: hash,
          status,
        })
        changed += 1
      } catch (error) {
        errors.push({ path: filePath, message: error instanceof Error ? error.message : 'Unable to parse Skill file' })
      }
    }

    const oldRows = sqlite.prepare("SELECT id, dir_path FROM skills WHERE status != 'missing'").all() as Array<{ id: string; dir_path: string }>
    const markMissing = sqlite.prepare("UPDATE skills SET status = 'missing', updated_at = MAX(unixepoch(), updated_at + 1) WHERE id = ?")
    for (const row of oldRows) {
      if (!seenDirectories.has(row.dir_path) && roots.some((root) => isUnderRoot(row.dir_path, root))) markMissing.run(row.id)
    }
  })

  scanTransaction()
  return { ok, invalid, errors, changed, unchanged }
}
