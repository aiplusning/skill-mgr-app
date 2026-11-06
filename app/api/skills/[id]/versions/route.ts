import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'
import { SaveSkillError, saveSkill } from '@/lib/save-skill'

export const dynamic = 'force-dynamic'

async function getSkillId(context: { params: Promise<{ id: string }> | { id: string } }): Promise<string> {
  return (await context.params).id
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const id = await getSkillId(context)
  const rows = sqlite.prepare('SELECT id, skill_id, content, note, created_at FROM skill_versions WHERE skill_id = ? ORDER BY created_at DESC, rowid DESC').all(id)
  return NextResponse.json(ok(rows))
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const id = await getSkillId(context)
  const skill = sqlite.prepare('SELECT id, slug, dir_path FROM skills WHERE id = ?').get(id) as { id: string; slug: string; dir_path: string } | undefined
  if (!skill) return NextResponse.json(fail('SKILL_NOT_FOUND', 'Skill not found', 404), { status: 404 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 }) }
  if (!body || typeof body !== 'object' || typeof (body as { content?: unknown }).content !== 'string') {
    return NextResponse.json(fail('INVALID_CONTENT', 'content must be a string', 400), { status: 400 })
  }
  try {
    return NextResponse.json(ok(saveSkill({
      skill,
      content: (body as { content: string }).content,
      mode: 'draft',
      options: { note: typeof (body as { note?: unknown }).note === 'string' ? (body as { note: string }).note : undefined },
    })))
  } catch (error) {
    if (error instanceof SaveSkillError) return NextResponse.json(fail(error.code, error.message, error.status), { status: error.status })
    return NextResponse.json(fail('SAVE_FAILED', error instanceof Error ? error.message : 'Unable to save draft', 500), { status: 500 })
  }
}
