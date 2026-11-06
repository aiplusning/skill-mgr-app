import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 }) }
  if (!sqlite.prepare('SELECT 1 FROM skills WHERE id = ?').get(id)) return NextResponse.json(fail('SKILL_NOT_FOUND', 'Skill not found', 404), { status: 404 })

  const transaction = sqlite.transaction(() => {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, column] of [['category', 'category'], ['business_scene', 'business_scene'], ['notes', 'notes']] as const) {
      if (key in body) { fields.push(`${column} = ?`); values.push(typeof body[key] === 'string' ? body[key] : null) }
    }
    if (fields.length) sqlite.prepare(`UPDATE skills SET ${fields.join(', ')}, updated_at = MAX(unixepoch(), updated_at + 1) WHERE id = ?`).run(...values, id)

    const relations = [
      { key: 'tag_ids', table: 'skill_tags', column: 'tag_id' },
      { key: 'project_ids', table: 'skill_projects', column: 'project_id' },
      { key: 'tool_ids', table: 'skill_tools', column: 'tool_id' },
    ] as const
    for (const relation of relations) {
      if (!(relation.key in body)) continue
      const ids = body[relation.key]
      if (!Array.isArray(ids) || ids.some((value) => typeof value !== 'string')) throw new Error(`${relation.key} must be an array of IDs`)
      sqlite.prepare(`DELETE FROM ${relation.table} WHERE skill_id = ?`).run(id)
      const insert = sqlite.prepare(`INSERT INTO ${relation.table} (skill_id, ${relation.column}) VALUES (?, ?)`)
      for (const relatedId of new Set(ids as string[])) insert.run(id, relatedId)
    }
  })

  try { transaction() } catch (error) {
    return NextResponse.json(fail('INVALID_METADATA', error instanceof Error ? error.message : 'Invalid metadata', 400), { status: 400 })
  }
  const skill = sqlite.prepare('SELECT * FROM skills WHERE id = ?').get(id) as Record<string, unknown>
  const tags = sqlite.prepare('SELECT t.id, t.name FROM skill_tags st JOIN tags t ON t.id = st.tag_id WHERE st.skill_id = ? ORDER BY t.name').all(id)
  const projects = sqlite.prepare('SELECT p.id, p.name FROM skill_projects sp JOIN projects p ON p.id = sp.project_id WHERE sp.skill_id = ? ORDER BY p.name').all(id)
  const tools = sqlite.prepare('SELECT t.id, t.name FROM skill_tools st JOIN tools t ON t.id = st.tool_id WHERE st.skill_id = ? ORDER BY t.name').all(id)
  return NextResponse.json(ok({ ...skill, tags, projects, tools }))
}
