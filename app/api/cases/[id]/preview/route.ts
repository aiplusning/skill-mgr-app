import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { assembleSystemPrompt } from '@/lib/agent-runner'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id: caseId } = await context.params
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  if (typeof body.with_agent !== 'boolean') return NextResponse.json(fail('INVALID_PREVIEW', 'with_agent must be a boolean', 400), { status: 400 })

  const testCase = sqlite.prepare('SELECT id, agent_id FROM test_cases WHERE id = ?').get(caseId) as { id: string; agent_id: string } | undefined
  if (!testCase) return NextResponse.json(fail('CASE_NOT_FOUND', 'Test case not found', 404), { status: 404 })
  const agent = sqlite.prepare('SELECT id, system_prompt FROM agents WHERE id = ?').get(testCase.agent_id) as { id: string; system_prompt: string | null } | undefined
  if (!agent) return NextResponse.json(fail('AGENT_NOT_FOUND', 'Agent not found', 404), { status: 404 })
  const skills = sqlite.prepare(`
    SELECT s.id AS skill_id, s.name, s.body, ags.order_index
    FROM agent_skills ags JOIN skills s ON s.id = ags.skill_id
    WHERE ags.agent_id = ? ORDER BY ags.order_index ASC
  `).all(agent.id) as Array<{ skill_id: string; name: string; body: string | null; order_index: number }>
  const systemPrompt = body.with_agent ? assembleSystemPrompt(agent, skills) : ''
  return NextResponse.json(ok({ system_prompt: systemPrompt }))
}
