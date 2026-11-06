import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { ok } from '@/lib/api-helpers'
export const dynamic = 'force-dynamic'
export async function GET() { return NextResponse.json(ok(sqlite.prepare('SELECT * FROM tools ORDER BY name ASC').all())) }
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } }, { status: 400 }) }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const globalPath = typeof body.global_path === 'string' ? body.global_path.trim() : ''
  const projectPath = typeof body.project_path === 'string' ? body.project_path.trim() : ''
  if (!name || !globalPath || !projectPath) return NextResponse.json({ ok: false, error: { code: 'INVALID_TOOL', message: 'name, global_path and project_path are required' } }, { status: 400 })
  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : name.toLowerCase().replace(/\s+/g, '-')
  try { sqlite.prepare('INSERT INTO tools (id, name, global_path, project_path, enabled) VALUES (?, ?, ?, ?, 1)').run(id, name, globalPath, projectPath) }
  catch (error) { return NextResponse.json({ ok: false, error: { code: 'TOOL_EXISTS', message: error instanceof Error ? error.message : 'Tool already exists' } }, { status: 409 }) }
  return NextResponse.json(ok({ id, name, global_path: globalPath, project_path: projectPath, enabled: 1 }), { status: 201 })
}
export async function PATCH(request: Request) {
  const body = await request.json() as Record<string, unknown>
  if (typeof body.id !== 'string' || typeof body.enabled !== 'boolean') return NextResponse.json({ ok: false, error: { code: 'INVALID_TOOL', message: 'id and boolean enabled are required' } }, { status: 400 })
  const result = sqlite.prepare('UPDATE tools SET enabled = ? WHERE id = ?').run(Number(body.enabled), body.id)
  if (!result.changes) return NextResponse.json({ ok: false, error: { code: 'TOOL_NOT_FOUND', message: 'Tool not found' } }, { status: 404 })
  return NextResponse.json(ok(sqlite.prepare('SELECT * FROM tools WHERE id = ?').get(body.id)))
}
