import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> | { id: string } }

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }

  const run = sqlite.prepare('SELECT id FROM test_runs WHERE id = ?').get(id)
  if (!run) return NextResponse.json(fail('RUN_NOT_FOUND', 'Test run not found', 404), { status: 404 })

  const fields: string[] = []
  const values: Array<number | string | null> = []
  if ('score' in body) {
    if (body.score !== null && (typeof body.score !== 'number' || !Number.isInteger(body.score) || body.score < 1 || body.score > 5)) {
      return NextResponse.json(fail('SCORE_OUT_OF_RANGE', 'score must be an integer from 1 to 5, or null to clear it', 422), { status: 422 })
    }
    fields.push('score = ?')
    values.push(body.score as number | null)
  }
  if ('score_note' in body) {
    if (body.score_note !== null && typeof body.score_note !== 'string') {
      return NextResponse.json(fail('INVALID_SCORE_NOTE', 'score_note must be a string or null', 400), { status: 400 })
    }
    fields.push('score_note = ?')
    values.push(typeof body.score_note === 'string' ? body.score_note : null)
  }
  if (!fields.length) return NextResponse.json(fail('EMPTY_UPDATE', 'Provide score and/or score_note to update', 400), { status: 400 })

  sqlite.prepare(`UPDATE test_runs SET ${fields.join(', ')} WHERE id = ?`).run(...values, id)
  const updated = sqlite.prepare(`
    SELECT id, case_id, provider_id, model, with_agent, skill_snapshot, system_prompt,
      output, input_tokens, output_tokens, latency_ms, score, score_note, error, created_at
    FROM test_runs WHERE id = ?
  `).get(id)
  return NextResponse.json(ok(updated))
}
