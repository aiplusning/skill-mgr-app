import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

async function agentIdFrom(context: { params: Promise<{ id: string }> | { id: string } }) {
  return (await context.params).id
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const agentId = await agentIdFrom(context)
  if (!sqlite.prepare('SELECT 1 FROM agents WHERE id = ?').get(agentId)) {
    return NextResponse.json(fail('AGENT_NOT_FOUND', 'Agent not found', 404), { status: 404 })
  }
  const cases = sqlite.prepare(`
    SELECT id, agent_id, name, user_input, context, expected, created_at
    FROM test_cases WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC
  `).all(agentId)
  return NextResponse.json(ok(cases))
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const agentId = await agentIdFrom(context)
  if (!sqlite.prepare('SELECT 1 FROM agents WHERE id = ?').get(agentId)) {
    return NextResponse.json(fail('AGENT_NOT_FOUND', 'Agent not found', 404), { status: 404 })
  }
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const userInput = typeof body.user_input === 'string' ? body.user_input.trim() : ''
  if (!name || !userInput) return NextResponse.json(fail('INVALID_CASE', 'name and user_input are required', 400), { status: 400 })

  const id = randomUUID()
  sqlite.prepare(`
    INSERT INTO test_cases (id, agent_id, name, user_input, context, expected)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, agentId, name, userInput,
    typeof body.context === 'string' && body.context.trim() ? body.context.trim() : null,
    typeof body.expected === 'string' && body.expected.trim() ? body.expected.trim() : null)
  const testCase = sqlite.prepare('SELECT id, agent_id, name, user_input, context, expected, created_at FROM test_cases WHERE id = ?').get(id)
  return NextResponse.json(ok(testCase), { status: 201 })
}
