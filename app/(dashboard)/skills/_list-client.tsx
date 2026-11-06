'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

interface SkillItem {
  id: string
  slug: string
  name: string
  description: string | null
  status: string | null
  category: string | null
  updated_at: number
}

export default function SkillListClient({ initialSkills }: { initialSkills: SkillItem[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [skills, setSkills] = useState(initialSkills)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const categories = useMemo(() => Array.from(new Set(initialSkills.map((skill) => skill.category).filter((value): value is string => Boolean(value)))), [initialSkills])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (category) params.set('category', category)
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/skills?${params.toString()}`, { signal: controller.signal, cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '无法加载 Skill 列表')
        setSkills(Array.isArray(payload.data) ? payload.data : [])
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '无法加载 Skill 列表')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, category])

  async function scan() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '扫描失败')
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (category) params.set('category', category)
      const listResponse = await fetch(`/api/skills?${params.toString()}`, { cache: 'no-store' })
      const listPayload = await listResponse.json()
      if (!listResponse.ok || !listPayload.ok) throw new Error(listPayload.error?.message || '刷新列表失败')
      setSkills(Array.isArray(listPayload.data) ? listPayload.data : [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '扫描失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Skills</h1>
          <p className="mt-1 text-sm text-slate-500">扫描、搜索和管理本地 Skill。</p>
        </div>
        <button type="button" onClick={() => void scan()} disabled={loading} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
          {loading ? '处理中…' : '扫描目录'}
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Skill 名称、描述或正文" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:bg-white" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:bg-white">
          <option value="">全部分类</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">正在加载 Skill 列表…</div> : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <p className="text-base font-medium text-slate-700">还没有 Skill，点击右上角扫描</p>
          <button type="button" onClick={() => void scan()} className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">扫描并刷新</button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skills.map((skill) => (
            <Link key={skill.id} href={`/skills/${encodeURIComponent(skill.id)}`} className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
              {skill.status !== 'ok' && <span className="absolute right-3 top-3 rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600">{skill.status === 'invalid' ? '无效' : skill.status}</span>}
              <div className="mb-3 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">{skill.category || '未分类'}</div>
              <h2 className="text-lg font-semibold text-slate-900">{skill.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{skill.description || '暂无描述'}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-slate-400">{skill.slug}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
