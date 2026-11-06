import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'
import { SaveSkillError, saveSkill } from '@/lib/save-skill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params
  const skill = sqlite.prepare('SELECT id, slug, dir_path FROM skills WHERE id = ?').get(id) as { id: string; slug: string; dir_path: string } | undefined
  if (!skill) return NextResponse.json(fail('SKILL_NOT_FOUND', 'Skill not found', 404), { status: 404 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 }) }
  if (!body || typeof body !== 'object' || typeof (body as { content?: unknown }).content !== 'string' || typeof (body as { targetDir?: unknown }).targetDir !== 'string') {
    return NextResponse.json(fail('INVALID_EXPORT', 'content and targetDir are required', 400), { status: 400 })
  }
  try {
    return NextResponse.json(ok(saveSkill({ skill, content: (body as { content: string }).content, mode: 'export', options: { targetDir: (body as { targetDir: string }).targetDir } })))
  } catch (error) {
    if (error instanceof SaveSkillError) return NextResponse.json(fail(error.code, error.message, error.status), { status: error.status })
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'EXPORT_FAILED'
    const message = error instanceof Error ? error.message : 'Unable to export Skill'
    return NextResponse.json(fail(code, message, 400), { status: 400 })
  }
}
