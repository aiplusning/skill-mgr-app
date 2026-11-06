import { sqlite } from '@/lib/db'
import SkillListClient from './_list-client'

export const dynamic = 'force-dynamic'

function readSkills() {
  const rows = sqlite
    .prepare(
      `SELECT id, slug, name, description, status, category, updated_at
       FROM skills
       ORDER BY updated_at DESC, name ASC`
    )
    .all() as Array<{
      id: string
      slug: string
      name: string
      description: string | null
      status: string | null
      category: string | null
      updated_at: number
    }>

  return rows.map((row) => ({
    ...row,
    updated_at: Number(row.updated_at ?? 0),
  }))
}

export default function SkillsPage() {
  const initialSkills = readSkills()

  return <SkillListClient initialSkills={initialSkills} />
}
