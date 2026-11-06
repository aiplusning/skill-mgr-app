import Link from 'next/link'
import { randomUUID } from 'node:crypto'
import { AgentsListClient } from './_list-client'
import { sqlite } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default function AgentsPage() {
  const agents = sqlite.prepare(`
    SELECT a.id, a.name, a.description, a.provider_id,
      COUNT(ags.skill_id) AS skill_count
    FROM agents a LEFT JOIN agent_skills ags ON ags.agent_id = a.id
    GROUP BY a.id ORDER BY a.updated_at DESC, a.name ASC
  `).all() as Array<{ id: string; name: string; description: string | null; provider_id: string | null; skill_count: number }>
  const providers = sqlite.prepare('SELECT id, name FROM providers ORDER BY name ASC').all() as Array<{ id: string; name: string }>

  return <div className="space-y-5">
    <header className="flex items-center justify-between border-b border-slate-200 pb-5">
      <div><h1 className="text-2xl font-semibold">Agents</h1><p className="mt-1 text-sm text-slate-500">编排 Skills 并配置 Agent。</p></div>
      <AgentsListClient providers={providers} />
    </header>
    {agents.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">还没有 Agent，点击“新建 Agent”开始编排。</div> : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => <Link key={agent.id} href={`/agents/${agent.id}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:shadow-sm">
          <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{agent.name}</h2><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">{agent.skill_count} Skills</span></div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{agent.description || '暂无描述'}</p>
          <p className="mt-3 text-xs text-slate-400">Provider：{providers.find((provider) => provider.id === agent.provider_id)?.name || '未设置'}</p>
        </Link>)}
      </div>
    )}
  </div>
}
