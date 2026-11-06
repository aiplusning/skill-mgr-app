import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> | { id: string } }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const agent = sqlite.prepare(`
    SELECT id, name, description, system_prompt, provider_id, created_at, updated_at
    FROM agents WHERE id = ?
  `).get(id) as Record<string, unknown> | undefined
  if (!agent) return NextResponse.json(fail('AGENT_NOT_FOUND', 'Agent not found', 404), { status: 404 })

  const skills = sqlite.prepare(`
    SELECT s.id AS skill_id, s.name, s.description, s.body, ags.order_index
    FROM agent_skills ags
    JOIN skills s ON s.id = ags.skill_id
    WHERE ags.agent_id = ?
    ORDER BY ags.order_index ASC
  `).all(id)
  return NextResponse.json(ok({ ...agent, skills }))
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  if (!sqlite.prepare('SELECT 1 FROM agents WHERE id = ?').get(id)) {
    return NextResponse.json(fail('AGENT_NOT_FOUND', 'Agent not found', 404), { status: 404 })
  }

  const fields: string[] = []
  const values: Array<string | null> = []
  for (const [key, column] of [['name', 'name'], ['description', 'description'], ['system_prompt', 'system_prompt']] as const) {
    if (!(key in body)) continue
    if (key === 'name' && (typeof body[key] !== 'string' || !body[key].trim())) {
      return NextResponse.json(fail('INVALID_AGENT', 'name must be a non-empty string', 400), { status: 400 })
    }
    if (body[key] !== null && typeof body[key] !== 'string') {
      return NextResponse.json(fail('INVALID_AGENT', `${key} must be a string or null`, 400), { status: 400 })
    }
    fields.push(`${column} = ?`)
    values.push(typeof body[key] === 'string' ? (key === 'name' ? body[key].trim() : body[key]) as string : null)
  }
  if ('provider_id' in body) {
    const providerId = body.provider_id === null || body.provider_id === '' ? null : body.provider_id
    if (providerId !== null && typeof providerId !== 'string') return NextResponse.json(fail('INVALID_AGENT', 'provider_id must be a string or null', 400), { status: 400 })
    if (providerId && !sqlite.prepare('SELECT 1 FROM providers WHERE id = ?').get(providerId)) {
      return NextResponse.json(fail('PROVIDER_NOT_FOUND', 'Provider not found', 400), { status: 400 })
    }
    fields.push('provider_id = ?')
    values.push(providerId as string | null)
  }
  if (fields.length) sqlite.prepare(`UPDATE agents SET ${fields.join(', ')}, updated_at = unixepoch() WHERE id = ?`).run(...values, id)

  const agent = sqlite.prepare('SELECT id, name, description, system_prompt, provider_id, created_at, updated_at FROM agents WHERE id = ?').get(id)
  return NextResponse.json(ok(agent))
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const result = sqlite.prepare('DELETE FROM agents WHERE id = ?').run(id)
  if (!result.changes) return NextResponse.json(fail('AGENT_NOT_FOUND', 'Agent not found', 404), { status: 404 })
  return NextResponse.json(ok({ deleted: true, id }))
}
