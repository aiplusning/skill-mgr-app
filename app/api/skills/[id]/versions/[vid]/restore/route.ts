import { readFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'
import { SaveSkillError, saveSkill } from '@/lib/save-skill'
import { parse, validateNameMatchesSlug } from '@/lib/frontmatter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string; vid: string }> | { id: string; vid: string } }) {
  const { id, vid } = await context.params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 }) }

  const mode = body && typeof body === 'object' ? (body as { mode?: unknown }).mode : undefined
  if (mode !== 'file' && mode !== 'draft') return NextResponse.json(fail('INVALID_MODE', "mode must be 'file' or 'draft'", 400), { status: 400 })

  const skill = sqlite.prepare('SELECT id, slug, dir_path FROM skills WHERE id = ?').get(id) as { id: string; slug: string; dir_path: string } | undefined
  if (!skill) return NextResponse.json(fail('SKILL_NOT_FOUND', 'Skill not found', 404), { status: 404 })
  const version = sqlite.prepare('SELECT id, content FROM skill_versions WHERE id = ? AND skill_id = ?').get(vid, id) as { id: string; content: string } | undefined
  if (!version) return NextResponse.json(fail('VERSION_NOT_FOUND', 'Skill version not found', 404), { status: 404 })

  if (mode === 'file') {
    const parsed = parse(version.content)
    if (parsed.error) return NextResponse.json(fail('INVALID_FRONTMATTER', parsed.error, 422), { status: 422 })
    const validation = validateNameMatchesSlug(parsed.data, skill.slug)
    if (!validation.ok) return NextResponse.json(fail('NAME_MISMATCH', validation.reason || 'frontmatter name must match slug', 422), { status: 422 })
  }

  let currentContent: string
  try {
    currentContent = readFileSync(path.join(skill.dir_path, 'SKILL.md'), 'utf8')
  } catch {
    return NextResponse.json(fail('SKILL_FILE_UNAVAILABLE', 'Cannot create restore backup because the current SKILL.md is unavailable', 409), { status: 409 })
  }

  const backupVersionId = randomUUID()
  const timestamp = new Date().toISOString()
  try {
    sqlite.prepare('INSERT INTO skill_versions (id, skill_id, content, note) VALUES (?, ?, ?, ?)')
      .run(backupVersionId, skill.id, currentContent, `auto backup before restore @ ${timestamp}`)

    if (mode === 'file') {
      saveSkill({ skill, content: version.content, mode: 'file' })
    } else {
      const restoredVersionId = randomUUID()
      sqlite.prepare('INSERT INTO skill_versions (id, skill_id, content, note) VALUES (?, ?, ?, ?)')
        .run(restoredVersionId, skill.id, version.content, `restored from version ${vid} @ ${timestamp}`)
    }

    return NextResponse.json(ok({ backup_version_id: backupVersionId }))
  } catch (error) {
    if (error instanceof SaveSkillError) return NextResponse.json(fail(error.code, error.message, error.status), { status: error.status })
    return NextResponse.json(fail('RESTORE_FAILED', error instanceof Error ? error.message : 'Unable to restore Skill version', 500), { status: 500 })
  }
}
