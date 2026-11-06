'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Skill = { id: string; slug: string; name: string; description: string | null }
type Tool = { id: string; name: string; global_path: string; enabled: number }
type Cell = { status: 'installed' | 'missing' | 'not_installed'; installed_path: string | null }

export function SkillMatrix() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [skillsResponse, toolsResponse] = await Promise.all([
          fetch('/api/skills', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/tools', { cache: 'no-store', signal: controller.signal }),
        ])
        const [skillsPayload, toolsPayload] = await Promise.all([skillsResponse.json(), toolsResponse.json()])
        if (!skillsResponse.ok || !skillsPayload.ok) throw new Error(skillsPayload.error?.message || 'Skill 加载失败')
        if (!toolsResponse.ok || !toolsPayload.ok) throw new Error(toolsPayload.error?.message || '工具加载失败')
        const allSkills = skillsPayload.data as Skill[]
        const allTools = (toolsPayload.data as Tool[]).filter((tool) => Number(tool.enabled) === 1)
        setSkills(allSkills); setTools(allTools)
        const requests = allSkills.flatMap((skill) => allTools.map(async (tool) => {
          const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}/install?tool_id=${encodeURIComponent(tool.id)}`, { cache: 'no-store', signal: controller.signal })
          const payload = await response.json()
          if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '分发状态读取失败')
          return [`${skill.id}:${tool.id}`, payload.data as Cell] as const
        }))
        setCells(Object.fromEntries(await Promise.all(requests)))
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '矩阵加载失败')
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  const statusClass = { installed: 'bg-emerald-500', missing: 'bg-amber-400', not_installed: 'bg-slate-200' }
  const statusLabel = { installed: '已安装', missing: '路径失效', not_installed: '未安装' }
  return <section className="space-y-4">
    <div><h1 className="text-2xl font-semibold">分发矩阵</h1><p className="mt-1 text-sm text-slate-500">行是 Skill，列是已启用工具；点击状态查看安装路径。</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Skill</th>{tools.map((tool) => <th key={tool.id} className="p-3">{tool.name}</th>)}</tr></thead><tbody className="divide-y">{skills.map((skill) => <tr key={skill.id}><th className="min-w-52 p-3 font-medium"><Link href={`/skills/${encodeURIComponent(skill.id)}`} className="hover:text-indigo-700">{skill.name}</Link><span className="mt-1 block text-xs font-normal text-slate-400">{skill.slug}</span></th>{tools.map((tool) => { const key = `${skill.id}:${tool.id}`; const cell = cells[key] || { status: 'not_installed' as const, installed_path: null }; return <td key={tool.id} className="p-3"><button type="button" aria-label={`${skill.name} / ${tool.name}: ${statusLabel[cell.status]}`} onClick={() => setExpanded(expanded === key ? null : key)} className={`h-4 w-4 rounded-full ring-2 ring-white ${statusClass[cell.status]}`} /><span className="ml-2 text-xs text-slate-500">{statusLabel[cell.status]}</span>{expanded === key && <p className="mt-2 max-w-xs break-all text-xs text-slate-500">{cell.installed_path || tool.global_path}</p>}</td>})}</tr>)}</tbody></table></div>
  </section>
}
