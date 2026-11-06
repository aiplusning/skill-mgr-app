import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { AgentRunnerError, assembleSystemPrompt, buildSnapshot, runCompletion } from '@/lib/agent-runner'
import { fail, ok } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id: caseId } = await context.params
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  if (typeof body.with_agent !== 'boolean') {
    return NextResponse.json(fail('INVALID_RUN', 'with_agent must be a boolean', 400), { status: 400 })
  }

  const testCase = sqlite.prepare(`
    SELECT tc.id, tc.agent_id, tc.user_input, tc.context
    FROM test_cases tc WHERE tc.id = ?
  `).get(caseId) as { id: string; agent_id: string; user_input: string; context: string | null } | undefined
  if (!testCase) return NextResponse.json(fail('CASE_NOT_FOUND', 'Test case not found', 404), { status: 404 })

  const agent = sqlite.prepare('SELECT id, system_prompt, provider_id FROM agents WHERE id = ?').get(testCase.agent_id) as {
    id: string; system_prompt: string | null; provider_id: string | null
  } | undefined
  if (!agent) return NextResponse.json(fail('AGENT_NOT_FOUND', 'Agent not found', 404), { status: 404 })

  const skills = sqlite.prepare(`
    SELECT s.id AS skill_id, s.name, s.body, ags.order_index
    FROM agent_skills ags JOIN skills s ON s.id = ags.skill_id
    WHERE ags.agent_id = ? ORDER BY ags.order_index ASC
  `).all(agent.id) as Array<{ skill_id: string; name: string; body: string | null; order_index: number }>
  const systemPrompt = body.with_agent ? assembleSystemPrompt(agent, skills) : ''
  const snapshot = buildSnapshot(agent, skills)

  let provider: { id: string; base_url: string; api_key: string; model: string; enabled: number | null } | undefined
  if (typeof body.provider_id === 'string' && body.provider_id) {
    provider = sqlite.prepare('SELECT id, base_url, api_key, model, enabled FROM providers WHERE id = ? AND enabled = 1').get(body.provider_id) as typeof provider
  } else if (agent.provider_id) {
    provider = sqlite.prepare('SELECT id, base_url, api_key, model, enabled FROM providers WHERE id = ? AND enabled = 1').get(agent.provider_id) as typeof provider
  }
  if (!provider) {
    provider = sqlite.prepare('SELECT id, base_url, api_key, model, enabled FROM providers WHERE enabled = 1 ORDER BY name ASC LIMIT 1').get() as typeof provider
  }

  const runId = randomUUID()
  const startedAt = Date.now()
  try {
    const result = await runCompletion({ provider, systemPrompt, userInput: testCase.user_input, context: testCase.context })
    sqlite.prepare(`
      INSERT INTO test_runs (id, case_id, provider_id, model, with_agent, skill_snapshot, system_prompt, output, input_tokens, output_tokens, latency_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(runId, caseId, provider?.id ?? null, provider?.model ?? 'unknown', Number(body.with_agent), JSON.stringify(snapshot), systemPrompt, result.output, result.input_tokens, result.output_tokens, result.latency_ms)
    return NextResponse.json(ok({ id: runId, case_id: caseId, provider_id: provider?.id ?? null, model: provider?.model ?? 'unknown', with_agent: Number(body.with_agent), skill_snapshot: JSON.stringify(snapshot), system_prompt: systemPrompt, ...result, error: null }), { status: 201 })
  } catch (error) {
    const runnerError = error instanceof AgentRunnerError ? error : new AgentRunnerError('LLM_ERROR', error instanceof Error ? error.message : 'LLM request failed')
    sqlite.prepare(`
      INSERT INTO test_runs (id, case_id, provider_id, model, with_agent, skill_snapshot, system_prompt, latency_ms, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(runId, caseId, provider?.id ?? null, provider?.model ?? 'unknown', Number(body.with_agent), JSON.stringify(snapshot), systemPrompt, Date.now() - startedAt, `${runnerError.code}: ${runnerError.message}`)
    return NextResponse.json(fail(runnerError.code, runnerError.message, runnerError.code === 'NO_PROVIDER' ? 400 : 502), { status: runnerError.code === 'NO_PROVIDER' ? 400 : 502 })
  }
}
