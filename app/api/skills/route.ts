import { NextResponse } from 'next/server'
import { sqlite } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildQuery(search: string | null, category: string | null, tag: string | null, project: string | null, tool: string | null) {
  const clauses: string[] = []
  const values: string[] = []

  if (search?.trim()) {
    // Quote the search as an FTS5 phrase so punctuation in user input cannot break MATCH syntax.
    const phrase = `"${search.trim().replaceAll('"', '""')}"`
    clauses.push('s.rowid IN (SELECT rowid FROM skills_fts WHERE skills_fts MATCH ?)')
    values.push(phrase)
  }
  if (category) {
    clauses.push('s.category = ?')
    values.push(category)
  }
  if (tag) {
    clauses.push('EXISTS (SELECT 1 FROM skill_tags st JOIN tags t ON t.id = st.tag_id WHERE st.skill_id = s.id AND t.name = ?)')
    values.push(tag)
  }
  if (project) {
    clauses.push('EXISTS (SELECT 1 FROM skill_projects sp JOIN projects p ON p.id = sp.project_id WHERE sp.skill_id = s.id AND p.name = ?)')
    values.push(project)
  }
  if (tool) {
    clauses.push('EXISTS (SELECT 1 FROM skill_tools sto JOIN tools t ON t.id = sto.tool_id WHERE sto.skill_id = s.id AND t.id = ?)')
    values.push(tool)
  }

  const sql = `
    SELECT s.id, s.slug, s.name, s.description, s.status, s.category, s.updated_at
    FROM skills s
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY s.updated_at DESC, s.name ASC
  `
  return { sql, values }
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const { sql, values } = buildQuery(
      searchParams.get('q'),
      searchParams.get('category'),
      searchParams.get('tag'),
      searchParams.get('project'),
      searchParams.get('tool'),
    )
    const skills = sqlite.prepare(sql).all(...values).map((row) => {
      const skill = row as Record<string, unknown>
      return { ...skill, updated_at: Number(skill.updated_at ?? 0) }
    })
    return NextResponse.json(ok(skills))
  } catch (error) {
    return NextResponse.json(
      fail('SKILL_QUERY_FAILED', error instanceof Error ? error.message : 'Unable to query Skills', 500),
      { status: 500 },
    )
  }
}
