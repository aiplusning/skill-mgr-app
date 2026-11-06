import { sqlite } from '@/lib/db'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { SkillDetailTabs } from './_tabs'

export const dynamic = 'force-dynamic'

async function resolveId(params: unknown): Promise<string> {
  if (!params) return ''
  if (typeof params === 'object' && params !== null) {
    const candidate = params as Record<string, unknown>
    if ('id' in candidate) return String(candidate.id ?? '')
    if ('then' in candidate) {
      const awaited = await Promise.resolve(params)
      return resolveId(awaited)
    }
  }
  return ''
}

async function loadSkill(id: string) {
  const row = sqlite
    .prepare(
      `SELECT s.*
       FROM skills s
       WHERE s.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined

  if (!row) return null

  return {
    ...row,
    tags: sqlite
      .prepare(
        `SELECT t.name
         FROM skill_tags st
         JOIN tags t ON t.id = st.tag_id
         WHERE st.skill_id = ?
         ORDER BY t.name ASC`
      )
      .all(id) as Array<{ name: string }>,
    projects: sqlite
      .prepare(
        `SELECT p.name
         FROM skill_projects sp
         JOIN projects p ON p.id = sp.project_id
         WHERE sp.skill_id = ?
         ORDER BY p.name ASC`
      )
      .all(id) as Array<{ name: string }>,
    tools: sqlite
      .prepare(
        `SELECT t.name
         FROM skill_tools st
         JOIN tools t ON t.id = st.tool_id
         WHERE st.skill_id = ?
         ORDER BY t.name ASC`
      )
      .all(id) as Array<{ name: string }>,
  }
}

export default async function SkillDetailPage({ params }: { params: unknown }) {
  const id = await resolveId(params)
  const skill = await loadSkill(id)

  if (!skill) {
    notFound()
  }

  return <SkillDetailTabs skill={skill as any} />
}
