import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveParams(params: unknown): Promise<{ id?: string }> {
  if (!params) return {}
  if (typeof params === 'object' && params !== null) {
    const candidate = params as Record<string, unknown>
    if ('id' in candidate) return { id: String(candidate.id ?? '') }
    if ('then' in candidate) {
      const awaited = await Promise.resolve(params)
      return resolveParams(awaited)
    }
  }
  return {}
}

export async function GET(_request: Request, context: { params?: unknown }) {
  const { id } = await resolveParams(context?.params)

  if (!id) {
    return NextResponse.json(fail('INVALID_ID', 'Skill id is required', 400), { status: 400 })
  }

  const skill = sqlite
    .prepare(
      `SELECT s.*
       FROM skills s
       WHERE s.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined

  if (!skill) {
    return NextResponse.json(fail('SKILL_NOT_FOUND', 'Skill not found', 404), { status: 404 })
  }

  const tags = sqlite
    .prepare(
      `SELECT t.id, t.name
       FROM skill_tags st
       JOIN tags t ON t.id = st.tag_id
       WHERE st.skill_id = ?
       ORDER BY t.name ASC`
    )
    .all(id) as Array<{ id: string; name: string }>

  const projects = sqlite
    .prepare(
      `SELECT p.id, p.name
       FROM skill_projects sp
       JOIN projects p ON p.id = sp.project_id
       WHERE sp.skill_id = ?
       ORDER BY p.name ASC`
    )
    .all(id) as Array<{ id: string; name: string }>

  const tools = sqlite
    .prepare(
      `SELECT t.id, t.name, t.global_path, t.project_path
       FROM skill_tools st
       JOIN tools t ON t.id = st.tool_id
       WHERE st.skill_id = ?
       ORDER BY t.name ASC`
    )
    .all(id) as Array<{ id: string; name: string; global_path: string; project_path: string }>

  return NextResponse.json(
    ok({
      ...skill,
      tags,
      projects,
      tools,
    })
  )
}
