import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agents = sqlite.prepare(`
    SELECT a.id, a.name, a.description, a.system_prompt, a.provider_id, a.created_at, a.updated_at,
      COUNT(ags.skill_id) AS skill_count
    FROM agents a
    LEFT JOIN agent_skills ags ON ags.agent_id = a.id
    GROUP BY a.id
    ORDER BY a.updated_at DESC, a.name ASC
  `).all()
  return NextResponse.json(ok(agents))
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json(fail('INVALID_AGENT', 'name is required', 400), { status: 400 })

  const description = typeof body.description === 'string' ? body.description.trim() : null
  const systemPrompt = typeof body.system_prompt === 'string' ? body.system_prompt : null
  const providerId = typeof body.provider_id === 'string' && body.provider_id ? body.provider_id : null
  if (providerId && !sqlite.prepare('SELECT 1 FROM providers WHERE id = ?').get(providerId)) {
    return NextResponse.json(fail('PROVIDER_NOT_FOUND', 'Provider not found', 400), { status: 400 })
  }

  const id = randomUUID()
  sqlite.prepare(`
    INSERT INTO agents (id, name, description, system_prompt, provider_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())
  `).run(id, name, description, systemPrompt, providerId)
  const agent = sqlite.prepare('SELECT id, name, description, system_prompt, provider_id, created_at, updated_at FROM agents WHERE id = ?').get(id)
  return NextResponse.json(ok(agent), { status: 201 })
}
