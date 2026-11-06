import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params
  if (!sqlite.prepare('SELECT 1 FROM test_cases WHERE id = ?').get(id)) {
    return NextResponse.json(fail('CASE_NOT_FOUND', 'Test case not found', 404), { status: 404 })
  }
  const runs = sqlite.prepare(`
    SELECT id, case_id, provider_id, model, with_agent, skill_snapshot, system_prompt,
      output, input_tokens, output_tokens, latency_ms, score, score_note, error, created_at
    FROM test_runs WHERE case_id = ? ORDER BY created_at DESC, rowid DESC
  `).all(id)
  return NextResponse.json(ok(runs))
}
