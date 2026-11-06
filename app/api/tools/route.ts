import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = sqlite.prepare('SELECT * FROM tools ORDER BY name ASC').all() as Array<Record<string, unknown>>
  return NextResponse.json(ok(rows))
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const globalPath = typeof body.global_path === 'string' ? body.global_path.trim() : ''
  const projectPath = typeof body.project_path === 'string' ? body.project_path.trim() : ''

  if (!name || !globalPath || !projectPath) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_TOOL', message: 'name, global_path and project_path are required' } }, { status: 400 })
  }

  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : name.toLowerCase().replace(/\s+/g, '-')
  sqlite.prepare(`INSERT OR REPLACE INTO tools (id, name, global_path, project_path, enabled) VALUES (?, ?, ?, ?, 1)`).run(id, name, globalPath, projectPath)

  return NextResponse.json(ok({ id, name, global_path: globalPath, project_path: projectPath }))
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  const enabled = typeof body.enabled === 'boolean' ? Number(body.enabled) : undefined

  if (!id) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_ID', message: 'tool id is required' } }, { status: 400 })
  }

  if (enabled !== undefined) {
    sqlite.prepare('UPDATE tools SET enabled = ? WHERE id = ?').run(enabled, id)
  }

  const row = sqlite.prepare('SELECT * FROM tools WHERE id = ?').get(id)
  return NextResponse.json(ok(row))
}
