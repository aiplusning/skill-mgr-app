import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-helpers'
import { InstallerError, uninstall } from '@/lib/installer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string; toolId: string }> | { id: string; toolId: string } }

export async function DELETE(_request: Request, context: Context) {
  const { id, toolId } = await context.params
  try { return NextResponse.json(ok(uninstall(id, toolId))) }
  catch (error) {
    if (error instanceof InstallerError) return NextResponse.json(fail(error.code, error.message, error.status), { status: error.status })
    return NextResponse.json(fail('UNINSTALL_FAILED', error instanceof Error ? error.message : 'Unable to uninstall Skill', 500), { status: 500 })
  }
}
