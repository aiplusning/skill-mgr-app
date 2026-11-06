import { sqlite } from '@/lib/db'
import SkillListClient from './_list-client'
import { SkillMatrix } from './_matrix'

export const dynamic = 'force-dynamic'

function readSkills() {
  const rows = sqlite.prepare(`SELECT id, slug, name, description, status, category, updated_at FROM skills ORDER BY updated_at DESC, name ASC`).all() as Array<{
    id: string; slug: string; name: string; description: string | null; status: string | null; category: string | null; updated_at: number
  }>
  return rows.map((row) => ({ ...row, updated_at: Number(row.updated_at ?? 0) }))
}

export default function SkillsPage({ searchParams }: { searchParams?: Promise<{ view?: string }> }) {
  const skills = readSkills()
  // Matrix is selectable via ?view=matrix; default view keeps existing list client behavior.
  const view = (searchParams as unknown as { view?: string } | undefined)?.view
  return view === 'matrix' ? <SkillMatrix /> : <SkillListClient initialSkills={skills} />
}
