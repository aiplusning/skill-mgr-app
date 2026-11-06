import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; vid: string }> | { id: string; vid: string } }) {
  const { id, vid } = await context.params
  const result = sqlite.prepare('DELETE FROM skill_versions WHERE id = ? AND skill_id = ?').run(vid, id)
  if (!result.changes) return NextResponse.json(fail('VERSION_NOT_FOUND', 'Skill version not found', 404), { status: 404 })
  return NextResponse.json(ok({ deleted: true, id: vid }))
}
