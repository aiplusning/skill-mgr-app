import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const id = context.params?.id
  if (!id) {
    return NextResponse.json(fail('INVALID_ID', 'Skill id is required', 400), { status: 400 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(fail('INVALID_BODY', 'Request body must be valid JSON', 400), { status: 400 })
  }

  const category = typeof body.category === 'string' ? body.category : undefined
  const businessScene = typeof body.business_scene === 'string' ? body.business_scene : undefined
  const notes = typeof body.notes === 'string' ? body.notes : undefined

  const tagIds = Array.isArray(body.tag_ids) ? body.tag_ids.filter((item): item is string => typeof item === 'string') : []
  const projectIds = Array.isArray(body.project_ids) ? body.project_ids.filter((item): item is string => typeof item === 'string') : []
  const toolIds = Array.isArray(body.tool_ids) ? body.tool_ids.filter((item): item is string => typeof item === 'string') : []

  const exists = sqlite.prepare('SELECT 1 FROM skills WHERE id = ?').get(id)
  if (!exists) {
    return NextResponse.json(fail('SKILL_NOT_FOUND', 'Skill not found', 404), { status: 404 })
  }

  const tx = sqlite.transaction(() => {
    if (category !== undefined || businessScene !== undefined || notes !== undefined) {
      const updates: string[] = []
      const values: unknown[] = []

      if (category !== undefined) {
        updates.push('category = ?')
        values.push(category)
      }
      if (businessScene !== undefined) {
        updates.push('business_scene = ?')
        values.push(businessScene)
      }
      if (notes !== undefined) {
        updates.push('notes = ?')
        values.push(notes)
      }

      values.push(id)
      sqlite.prepare(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }

    if (tagIds.length || projectIds.length || toolIds.length) {
      sqlite.prepare('DELETE FROM skill_tags WHERE skill_id = ?').run(id)
      sqlite.prepare('DELETE FROM skill_projects WHERE skill_id = ?').run(id)
      sqlite.prepare('DELETE FROM skill_tools WHERE skill_id = ?').run(id)

      for (const tagId of tagIds) {
        sqlite.prepare('INSERT OR IGNORE INTO skill_tags (skill_id, tag_id) VALUES (?, ?)').run(id, tagId)
      }
      for (const projectId of projectIds) {
        sqlite.prepare('INSERT OR IGNORE INTO skill_projects (skill_id, project_id) VALUES (?, ?)').run(id, projectId)
      }
      for (const toolId of toolIds) {
        sqlite.prepare('INSERT OR IGNORE INTO skill_tools (skill_id, tool_id) VALUES (?, ?)').run(id, toolId)
      }
    }
  })

  tx()

  const skill = sqlite.prepare('SELECT * FROM skills WHERE id = ?').get(id) as Record<string, unknown>
  return NextResponse.json(ok(skill))
}
