import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { ok } from '@/lib/api-helpers'

export async function GET() {
  const rows = sqlite.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Array<Record<string, unknown>>
  return NextResponse.json(ok(rows))
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const kind = typeof body.kind === 'string' ? body.kind : 'work'

  if (!name) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_TAG', message: 'name is required' } }, { status: 400 })
  }

  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : name.toLowerCase().replace(/\s+/g, '-')
  sqlite.prepare(`INSERT OR REPLACE INTO tags (id, name, color, created_at) VALUES (?, ?, ?, unixepoch())`).run(id, name, kind)

  return NextResponse.json(ok({ id, name, color: kind }))
}
