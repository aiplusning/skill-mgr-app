import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> | { id: string } }

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params
  if (!sqlite.prepare('SELECT 1 FROM test_cases WHERE id = ?').get(id)) {
    return NextResponse.json(fail('CASE_NOT_FOUND', 'Test case not found', 404), { status: 404 })
  }
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  const fields: string[] = []
  const values: Array<string | null> = []
  for (const [key, column] of [['name', 'name'], ['user_input', 'user_input'], ['context', 'context'], ['expected', 'expected']] as const) {
    if (!(key in body)) continue
    if ((key === 'name' || key === 'user_input') && (typeof body[key] !== 'string' || !body[key].trim())) {
      return NextResponse.json(fail('INVALID_CASE', `${key} must be a non-empty string`, 400), { status: 400 })
    }
    if (body[key] !== null && typeof body[key] !== 'string') {
      return NextResponse.json(fail('INVALID_CASE', `${key} must be a string or null`, 400), { status: 400 })
    }
    fields.push(`${column} = ?`)
    values.push(typeof body[key] === 'string' ? (body[key] as string).trim() || null : null)
  }
  if (fields.length) sqlite.prepare(`UPDATE test_cases SET ${fields.join(', ')} WHERE id = ?`).run(...values, id)
  return NextResponse.json(ok(sqlite.prepare('SELECT id, agent_id, name, user_input, context, expected, created_at FROM test_cases WHERE id = ?').get(id)))
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params
  const result = sqlite.prepare('DELETE FROM test_cases WHERE id = ?').run(id)
  if (!result.changes) return NextResponse.json(fail('CASE_NOT_FOUND', 'Test case not found', 404), { status: 404 })
  return NextResponse.json(ok({ deleted: true, id }))
}
