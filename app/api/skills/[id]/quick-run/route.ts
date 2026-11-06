import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { AgentRunnerError, runCompletion } from '@/lib/agent-runner'
import { fail, ok } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> | { id: string } }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }

  const userInput = typeof body.user_input === 'string' ? body.user_input.trim() : ''
  if (!userInput) {
    return NextResponse.json(fail('INVALID_INPUT', 'user_input is required', 400), { status: 400 })
  }

  const skill = sqlite.prepare('SELECT id, body FROM skills WHERE id = ?').get(id) as { id: string; body: string | null } | undefined
  if (!skill) return NextResponse.json(fail('SKILL_NOT_FOUND', 'Skill not found', 404), { status: 404 })

  let provider: { id: string; base_url: string; api_key: string; model: string; enabled: number | null } | undefined
  if (typeof body.provider_id === 'string' && body.provider_id.trim()) {
    provider = sqlite.prepare('SELECT id, base_url, api_key, model, enabled FROM providers WHERE id = ? AND enabled = 1').get(body.provider_id.trim()) as typeof provider
    if (!provider) return NextResponse.json(fail('NO_PROVIDER', 'The selected provider is unavailable or disabled.', 400), { status: 400 })
  } else {
    provider = sqlite.prepare('SELECT id, base_url, api_key, model, enabled FROM providers WHERE enabled = 1 ORDER BY name ASC LIMIT 1').get() as typeof provider
  }

  try {
    const result = await runCompletion({ provider, systemPrompt: skill.body || '', userInput })
    return NextResponse.json(ok({ output: result.output, latency_ms: result.latency_ms }))
  } catch (error) {
    if (error instanceof AgentRunnerError) {
      const status = error.code === 'NO_PROVIDER' ? 400 : error.code === 'TIMEOUT' ? 504 : 502
      return NextResponse.json(fail(error.code, error.message, status), { status })
    }
    return NextResponse.json(fail('LLM_ERROR', error instanceof Error ? error.message : 'LLM request failed', 502), { status: 502 })
  }
}
