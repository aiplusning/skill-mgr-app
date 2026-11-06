import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = sqlite.prepare('SELECT * FROM projects ORDER BY name ASC').all() as Array<Record<string, unknown>>
  return NextResponse.json(ok(rows))
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const pathValue = typeof body.path === 'string' ? body.path.trim() : ''

  if (!name) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_PROJECT', message: 'name is required' } }, { status: 400 })
  }

  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : name.toLowerCase().replace(/\s+/g, '-')
  sqlite.prepare(`INSERT OR REPLACE INTO projects (id, name, path, created_at, updated_at) VALUES (?, ?, ?, unixepoch(), unixepoch())`).run(id, name, pathValue)

  return NextResponse.json(ok({ id, name, path: pathValue }))
}
