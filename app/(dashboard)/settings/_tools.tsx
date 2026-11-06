'use client'

import { useEffect, useState } from 'react'
interface Tool { id: string; name: string; global_path: string; project_path: string; enabled: number }
export function ToolsSettings() {
  const [items, setItems] = useState<Tool[]>([])
  const [name, setName] = useState(''); const [globalPath, setGlobalPath] = useState(''); const [projectPath, setProjectPath] = useState('')
  async function load() { const response = await fetch('/api/tools'); const payload = await response.json(); setItems(payload.data || []) }
  useEffect(() => { void load() }, [])
  async function add(event: React.FormEvent) { event.preventDefault(); await fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, global_path: globalPath, project_path: projectPath }) }); setName(''); setGlobalPath(''); setProjectPath(''); await load() }
  async function toggle(item: Tool) { await fetch('/api/tools', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, enabled: !item.enabled }) }); await load() }
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Tools</h2><form onSubmit={add} className="grid gap-2 md:grid-cols-4"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" className="rounded-lg border p-2"/><input required value={globalPath} onChange={(e) => setGlobalPath(e.target.value)} placeholder="全局路径" className="rounded-lg border p-2"/><input required value={projectPath} onChange={(e) => setProjectPath(e.target.value)} placeholder="项目路径" className="rounded-lg border p-2"/><button className="rounded-lg bg-indigo-600 px-3 py-2 text-white">新增 Tool</button></form><ul className="divide-y rounded-xl border">{items.map((item) => <li key={item.id} className="flex items-center justify-between p-3 text-sm"><span>{item.name} <span className="text-slate-400">{item.global_path} · {item.project_path}</span></span><button type="button" onClick={() => void toggle(item)} className="text-indigo-700">{item.enabled ? '启用' : '已停用'}</button></li>)}</ul></section>
}
