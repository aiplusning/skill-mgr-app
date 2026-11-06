'use client'

import { useEffect, useState } from 'react'
interface Tag { id: string; name: string; color: string | null }
export function TagsSettings() {
  const [items, setItems] = useState<Tag[]>([]); const [name, setName] = useState(''); const [kind, setKind] = useState('work')
  async function load() { const response = await fetch('/api/tags'); const payload = await response.json(); setItems(payload.data || []) }
  useEffect(() => { void load() }, [])
  async function add(event: React.FormEvent) { event.preventDefault(); await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, kind }) }); setName(''); await load() }
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Tags</h2><form onSubmit={add} className="grid gap-2 md:grid-cols-3"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="标签名称" className="rounded-lg border p-2"/><select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border p-2"><option value="work">工作</option><option value="personal">个人</option><option value="team">团队</option></select><button className="rounded-lg bg-indigo-600 px-3 py-2 text-white">新增 Tag</button></form><ul className="divide-y rounded-xl border">{items.map((item) => <li key={item.id} className="p-3 text-sm">{item.name} <span className="text-slate-400">{item.color}</span></li>)}</ul></section>
}
