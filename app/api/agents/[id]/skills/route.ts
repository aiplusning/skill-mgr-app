import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> | { id: string } }

export async function PUT(request: Request, context: RouteContext) {
  const { id: agentId } = await context.params
  if (!sqlite.prepare('SELECT 1 FROM agents WHERE id = ?').get(agentId)) {
    return NextResponse.json(fail('AGENT_NOT_FOUND', 'Agent not found', 404), { status: 404 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  if (!Array.isArray(body)) return NextResponse.json(fail('INVALID_SKILLS', 'Request body must be an array', 400), { status: 400 })
  if (body.length === 0) return NextResponse.json(fail('AT_LEAST_ONE_SKILL', 'An Agent must contain at least one Skill', 400), { status: 400 })

  const entries: Array<{ skill_id: string; order_index: number }> = []
  for (const item of body) {
    if (!item || typeof item !== 'object' || typeof item.skill_id !== 'string' || !item.skill_id || !Number.isInteger(item.order_index)) {
      return NextResponse.json(fail('INVALID_SKILLS', 'Each entry requires a skill_id and integer order_index', 400), { status: 400 })
    }
    entries.push({ skill_id: item.skill_id, order_index: item.order_index })
  }
  const orderIndexes = entries.map((entry) => entry.order_index).sort((a, b) => a - b)
  if (orderIndexes.some((order, index) => order !== index)) {
    return NextResponse.json(fail('INVALID_ORDER', 'order_index must contain each integer from 0 to n-1 exactly once', 400), { status: 400 })
  }
  if (new Set(entries.map((entry) => entry.skill_id)).size !== entries.length) {
    return NextResponse.json(fail('DUPLICATE_SKILL', 'A Skill can only appear once in an Agent', 400), { status: 400 })
  }
  const findSkill = sqlite.prepare('SELECT 1 FROM skills WHERE id = ?')
  if (entries.some((entry) => !findSkill.get(entry.skill_id))) {
    return NextResponse.json(fail('SKILL_NOT_FOUND', 'One or more Skills were not found', 400), { status: 400 })
  }

  const replaceSkills = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM agent_skills WHERE agent_id = ?').run(agentId)
    const insert = sqlite.prepare('INSERT INTO agent_skills (agent_id, skill_id, order_index) VALUES (?, ?, ?)')
    for (const entry of entries) insert.run(agentId, entry.skill_id, entry.order_index)
    sqlite.prepare('UPDATE agents SET updated_at = unixepoch() WHERE id = ?').run(agentId)
  })
  replaceSkills()

  const skills = sqlite.prepare(`
    SELECT s.id AS skill_id, s.name, s.description, ags.order_index
    FROM agent_skills ags JOIN skills s ON s.id = ags.skill_id
    WHERE ags.agent_id = ? ORDER BY ags.order_index ASC
  `).all(agentId)
  return NextResponse.json(ok(skills))
}
