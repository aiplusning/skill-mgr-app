'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface SkillItem { id: string; slug: string; name: string; description: string | null; status: string | null; category: string | null; updated_at: number }

export default function SkillListClient({ initialSkills }: { initialSkills: SkillItem[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [skills, setSkills] = useState(initialSkills)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const categories = useMemo(() => Array.from(new Set(initialSkills.map((skill) => skill.category).filter((value): value is string => Boolean(value)))), [initialSkills])
  const view = searchParams.get('view') === 'matrix' ? 'matrix' : 'list'

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (category) params.set('category', category)
      setLoading(true); setError('')
      try {
        const response = await fetch(`/api/skills?${params.toString()}`, { signal: controller.signal, cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '无法加载 Skill 列表')
        setSkills(Array.isArray(payload.data) ? payload.data : [])
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '无法加载 Skill 列表') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, category])

  async function scan() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '扫描失败')
      const params = new URLSearchParams(); if (query.trim()) params.set('q', query.trim()); if (category) params.set('category', category)
      const listResponse = await fetch(`/api/skills?${params.toString()}`, { cache: 'no-store' }); const listPayload = await listResponse.json()
      if (!listResponse.ok || !listPayload.ok) throw new Error(listPayload.error?.message || '刷新列表失败')
      setSkills(Array.isArray(listPayload.data) ? listPayload.data : [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : '扫描失败') }
    finally { setLoading(false) }
  }

  function switchView(nextView: 'list' | 'matrix') {
    const params = new URLSearchParams(searchParams.toString())
    if (nextView === 'matrix') params.set('view', 'matrix'); else params.delete('view')
    router.push(`/skills${params.size ? `?${params.toString()}` : ''}`)
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Skills</h1><p className="mt-1 text-sm text-slate-500">扫描、搜索和管理本地 Skill。</p></div><div className="flex gap-2"><div className="inline-flex rounded-lg border p-1"><button type="button" onClick={() => switchView('list')} aria-pressed={view === 'list'} className={`rounded px-3 py-1.5 text-sm ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>列表</button><button type="button" onClick={() => switchView('matrix')} aria-pressed={view === 'matrix'} className={`rounded px-3 py-1.5 text-sm ${view === 'matrix' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>矩阵</button></div><button type="button" onClick={() => void scan()} disabled={loading} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{loading ? '处理中…' : '扫描目录'}</button></div></header>
    {view === 'matrix' ? <SkillMatrixInline /> : <>
      <div className="flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Skill 名称、描述或正文" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:bg-white"/><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"><option value="">全部分类</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">正在加载 Skill 列表…</div> : skills.length === 0 ? <div className="rounded-xl border border-dashed bg-slate-50 p-10 text-center"><p className="font-medium text-slate-700">还没有 Skill，点击右上角扫描</p><button type="button" onClick={() => void scan()} className="mt-4 rounded-lg border bg-white px-3 py-2 text-sm">扫描并刷新</button></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{skills.map((skill) => <Link key={skill.id} href={`/skills/${encodeURIComponent(skill.id)}`} className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200 hover:shadow-md">{skill.status !== 'ok' && <span className="absolute right-3 top-3 rounded-full bg-red-50 px-2 py-1 text-[11px] text-red-600">{skill.status === 'invalid' ? '无效' : skill.status}</span>}<div className="mb-3 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700">{skill.category || '未分类'}</div><h2 className="text-lg font-semibold">{skill.name}</h2><p className="mt-2 line-clamp-3 text-sm text-slate-600">{skill.description || '暂无描述'}</p><p className="mt-3 text-[11px] text-slate-400">{skill.slug}</p></Link>)}</div>}
    </>}
  </div>
}

function SkillMatrixInline() {
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [tools, setTools] = useState<Array<{ id: string; name: string; global_path: string; enabled: number }>>([])
  const [cells, setCells] = useState<Record<string, { status: 'installed' | 'missing' | 'not_installed'; installed_path: string | null }>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [sResponse, tResponse] = await Promise.all([fetch('/api/skills', { signal: controller.signal, cache: 'no-store' }), fetch('/api/tools', { signal: controller.signal, cache: 'no-store' })])
        const [sPayload, tPayload] = await Promise.all([sResponse.json(), tResponse.json()])
        if (!sResponse.ok || !sPayload.ok || !tResponse.ok || !tPayload.ok) throw new Error('无法加载分发矩阵')
        const skillRows = sPayload.data as SkillItem[]; const toolRows = (tPayload.data as Array<{ id: string; name: string; global_path: string; enabled: number }>).filter((tool) => Number(tool.enabled) === 1)
        setSkills(skillRows); setTools(toolRows)
        const rows = await Promise.all(skillRows.flatMap((skill) => toolRows.map(async (tool) => { const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}/install?tool_id=${encodeURIComponent(tool.id)}`, { signal: controller.signal, cache: 'no-store' }); const payload = await response.json(); if (!response.ok || !payload.ok) throw new Error('读取安装状态失败'); return [`${skill.id}:${tool.id}`, payload.data] as const })))
        setCells(Object.fromEntries(rows))
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '无法加载分发矩阵') }
    }
    void load(); return () => controller.abort()
  }, [])
  const colors = { installed: 'bg-emerald-500', missing: 'bg-amber-400', not_installed: 'bg-slate-200' }
  const labels = { installed: '已安装', missing: '路径失效', not_installed: '未安装' }
  return <div className="space-y-3">{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="overflow-x-auto rounded-xl border"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Skill</th>{tools.map((tool) => <th key={tool.id} className="p-3">{tool.name}</th>)}</tr></thead><tbody className="divide-y">{skills.map((skill) => <tr key={skill.id}><th className="min-w-48 p-3"><Link href={`/skills/${encodeURIComponent(skill.id)}`} className="hover:text-indigo-700">{skill.name}</Link><span className="block text-xs font-normal text-slate-400">{skill.slug}</span></th>{tools.map((tool) => { const key = `${skill.id}:${tool.id}`; const cell = cells[key] || { status: 'not_installed' as const, installed_path: null }; return <td key={tool.id} className="p-3"><button type="button" onClick={() => setExpanded(expanded === key ? null : key)} className={`h-3.5 w-3.5 rounded-full ${colors[cell.status]}`} aria-label={`${labels[cell.status]}`} /><span className="ml-2 text-xs text-slate-500">{labels[cell.status]}</span>{expanded === key && <p className="mt-2 max-w-xs break-all text-xs text-slate-500">{cell.installed_path || tool.global_path}</p>}</td>})}</tr>)}</tbody></table></div></div>
}
