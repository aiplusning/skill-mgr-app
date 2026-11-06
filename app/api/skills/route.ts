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

  const categories = useMemo(
    () => Array.from(new Set(initialSkills.map((skill) => skill.category).filter(Boolean))) as string[],
    [initialSkills]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (category) params.set('category', category)

      setLoading(true)
      try {
        const response = await fetch(`/api/skills?${params.toString()}`, { signal: controller.signal })
        const payload = await response.json()
        setSkills(Array.isArray(payload?.data) ? payload.data : [])
      } catch {
        setSkills([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query, category])

  const handleScan = async () => {
    await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category) params.set('category', category)
    const response = await fetch(`/api/skills?${params.toString()}`)
    const payload = await response.json()
    setSkills(Array.isArray(payload?.data) ? payload.data : [])
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Skills</h1>
          <p className="mt-1 text-sm text-slate-500">扫描与维护本地的 Skill 索引。</p>
        </div>

        <button
          type="button"
          onClick={handleScan}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          扫描目录
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索 name / description / body"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white"
        />

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white"
        >
          <option value="">全部分类</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          正在加载 Skill 列表…
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <div className="text-base font-medium text-slate-700">还没有 Skill，点击右上角扫描</div>
          <button
            type="button"
            onClick={handleScan}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            扫描并刷新
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skills.map((skill) => (
            <Link
              key={skill.id}
              href={`/skills/${skill.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                  {skill.category || 'general'}
                </div>
                {skill.status !== 'ok' ? (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600">invalid</span>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="text-lg font-semibold text-slate-900">{skill.name}</div>
                <div className="text-sm text-slate-600">{skill.description || '暂无描述'}</div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{skill.slug}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
