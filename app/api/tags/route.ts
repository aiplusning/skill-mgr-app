import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { ok } from '@/lib/api-helpers'
export const dynamic = 'force-dynamic'
export async function GET() { return NextResponse.json(ok(sqlite.prepare('SELECT * FROM tags ORDER BY name ASC').all())) }
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } }, { status: 400 }) }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const kind = typeof body.kind === 'string' ? body.kind : 'work'
  if (!name) return NextResponse.json({ ok: false, error: { code: 'INVALID_TAG', message: 'name is required' } }, { status: 400 })
  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : name.toLowerCase().replace(/\s+/g, '-')
  try {
    sqlite.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, kind)
  } catch (error) { return NextResponse.json({ ok: false, error: { code: 'TAG_EXISTS', message: error instanceof Error ? error.message : 'Tag already exists' } }, { status: 409 }) }
  return NextResponse.json(ok({ id, name, color: kind }), { status: 201 })
}
