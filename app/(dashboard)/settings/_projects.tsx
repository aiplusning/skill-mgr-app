'use client'

import { useEffect, useState } from 'react'
interface Project { id: string; name: string; path: string | null }
export function ProjectsSettings() {
  const [items, setItems] = useState<Project[]>([]); const [name, setName] = useState(''); const [pathValue, setPathValue] = useState('')
  async function load() { const response = await fetch('/api/projects'); const payload = await response.json(); setItems(payload.data || []) }
  useEffect(() => { void load() }, [])
  async function add(event: React.FormEvent) { event.preventDefault(); await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, path: pathValue }) }); setName(''); setPathValue(''); await load() }
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Projects</h2><form onSubmit={add} className="grid gap-2 md:grid-cols-3"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="项目名称" className="rounded-lg border p-2"/><input value={pathValue} onChange={(e) => setPathValue(e.target.value)} placeholder="根路径" className="rounded-lg border p-2"/><button className="rounded-lg bg-indigo-600 px-3 py-2 text-white">新增 Project</button></form><ul className="divide-y rounded-xl border">{items.map((item) => <li key={item.id} className="p-3 text-sm">{item.name} <span className="text-slate-400">{item.path}</span></li>)}</ul></section>
}
