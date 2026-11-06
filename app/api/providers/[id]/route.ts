import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'
import { toSafeProvider } from '@/lib/provider-serializer'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  const current = sqlite.prepare('SELECT id, name, base_url, api_key, model, enabled FROM providers WHERE id = ?').get(id) as {
    id: string; name: string; base_url: string; api_key: string; model: string; enabled: number | null
  } | undefined
  if (!current) return NextResponse.json(fail('PROVIDER_NOT_FOUND', 'Provider not found', 404), { status: 404 })

  const updates: string[] = []
  const values: Array<string | number> = []
  for (const [field, column] of [['name', 'name'], ['base_url', 'base_url'], ['model', 'model']] as const) {
    if (field in body) {
      if (typeof body[field] !== 'string' || !body[field].trim()) return NextResponse.json(fail('INVALID_PROVIDER', `${field} must be a non-empty string`, 400), { status: 400 })
      updates.push(`${column} = ?`)
      values.push(body[field].trim())
    }
  }
  if ('api_key' in body) {
    if (typeof body.api_key !== 'string') return NextResponse.json(fail('INVALID_PROVIDER', 'api_key must be a string', 400), { status: 400 })
    // A masked key sent back by a settings form means “leave the existing secret unchanged”.
    if (!/^sk-\*{3,}/.test(body.api_key)) {
      updates.push('api_key = ?')
      values.push(body.api_key)
    }
  }
  if ('enabled' in body) {
    const enabled = body.enabled === true || body.enabled === 1 ? 1 : body.enabled === false || body.enabled === 0 ? 0 : null
    if (enabled === null) return NextResponse.json(fail('INVALID_PROVIDER', 'enabled must be a boolean or 0/1', 400), { status: 400 })
    updates.push('enabled = ?')
    values.push(enabled)
  }
  if (updates.length) sqlite.prepare(`UPDATE providers SET ${updates.join(', ')} WHERE id = ?`).run(...values, id)

  const provider = sqlite.prepare('SELECT id, name, base_url, api_key, model, enabled FROM providers WHERE id = ?').get(id) as Parameters<typeof toSafeProvider>[0]
  return NextResponse.json(ok(toSafeProvider(provider)))
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params
  const result = sqlite.prepare('DELETE FROM providers WHERE id = ?').run(id)
  if (!result.changes) return NextResponse.json(fail('PROVIDER_NOT_FOUND', 'Provider not found', 404), { status: 404 })
  return NextResponse.json(ok({ deleted: true, id }))
}
