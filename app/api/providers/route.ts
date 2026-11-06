import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'
import { toSafeProvider } from '@/lib/provider-serializer'

export const dynamic = 'force-dynamic'

function parseEnabled(value: unknown, fallback = 1): number | null {
  if (value === undefined) return fallback
  if (value === true || value === 1 || value === '1') return 1
  if (value === false || value === 0 || value === '0') return 0
  return null
}

export async function GET() {
  const rows = sqlite.prepare('SELECT id, name, base_url, api_key, model, enabled FROM providers ORDER BY name ASC').all() as Array<{
    id: string; name: string; base_url: string; api_key: string; model: string; enabled: number | null
  }>
  return NextResponse.json(ok(rows.map(toSafeProvider)))
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const baseUrl = typeof body.base_url === 'string' ? body.base_url.trim() : ''
  const model = typeof body.model === 'string' ? body.model.trim() : ''
  const apiKey = typeof body.api_key === 'string' ? body.api_key : ''
  const enabled = parseEnabled(body.enabled)
  if (!name || !baseUrl || !model || enabled === null) {
    return NextResponse.json(fail('INVALID_PROVIDER', 'name, base_url and model are required; enabled must be boolean or 0/1', 400), { status: 400 })
  }
  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : randomUUID()
  try {
    sqlite.prepare('INSERT INTO providers (id, name, base_url, api_key, model, enabled) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, name, baseUrl, apiKey, model, enabled)
  } catch (error) {
    return NextResponse.json(fail('PROVIDER_CONFLICT', error instanceof Error ? error.message : 'Provider could not be created', 409), { status: 409 })
  }
  const provider = sqlite.prepare('SELECT id, name, base_url, api_key, model, enabled FROM providers WHERE id = ?').get(id) as Parameters<typeof toSafeProvider>[0]
  return NextResponse.json(ok(toSafeProvider(provider)), { status: 201 })
}
