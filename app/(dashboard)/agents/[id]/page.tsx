import { notFound } from 'next/navigation'
import { sqlite } from '@/lib/db'
import { AgentCompose } from './_compose'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> | { id: string } }

export default async function AgentDetailPage({ params }: Params) {
  const { id } = await params
  const agent = sqlite.prepare('SELECT id, name, description, system_prompt, provider_id FROM agents WHERE id = ?').get(id) as {
    id: string; name: string; description: string | null; system_prompt: string | null; provider_id: string | null
  } | undefined
  if (!agent) notFound()
  const skills = sqlite.prepare(`
    SELECT s.id AS skill_id, s.name, s.description, ags.order_index
    FROM agent_skills ags JOIN skills s ON s.id = ags.skill_id
    WHERE ags.agent_id = ? ORDER BY ags.order_index ASC
  `).all(id) as Array<{ skill_id: string; name: string; description: string | null; order_index: number }>
  const providers = sqlite.prepare('SELECT id, name FROM providers ORDER BY name ASC').all() as Array<{ id: string; name: string }>

  return <AgentCompose agent={agent} initialSkills={skills} providers={providers} />
}
