import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-helpers'
import { getInstallationStatus, install, InstallerError } from '@/lib/installer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> | { id: string } }

export async function GET(request: Request, context: Context) {
  const { id } = await context.params
  const toolId = new URL(request.url).searchParams.get('tool_id')
  if (!toolId) return NextResponse.json(fail('INVALID_TOOL_ID', 'tool_id is required', 400), { status: 400 })
  try { return NextResponse.json(ok(getInstallationStatus(id, toolId))) }
  catch (error) {
    if (error instanceof InstallerError) return NextResponse.json(fail(error.code, error.message, error.status), { status: error.status })
    return NextResponse.json(fail('INSTALL_STATUS_FAILED', error instanceof Error ? error.message : 'Unable to read installation status', 500), { status: 500 })
  }
}

export async function POST(request: Request, context: Context) {
  const { id } = await context.params
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> }
  catch { return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 }) }
  if (typeof body.tool_id !== 'string' || (body.mode !== 'symlink' && body.mode !== 'copy')) {
    return NextResponse.json(fail('INVALID_INSTALL', 'tool_id and mode (symlink|copy) are required', 400), { status: 400 })
  }
  try { return NextResponse.json(ok(install(id, body.tool_id, body.mode)), { status: 201 }) }
  catch (error) {
    if (error instanceof InstallerError) return NextResponse.json(fail(error.code, error.message, error.status), { status: error.status })
    return NextResponse.json(fail('INSTALL_FAILED', error instanceof Error ? error.message : 'Unable to install Skill', 500), { status: 500 })
  }
}
