'use client'

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Skill = { id: string; skill_id?: string; name: string; description: string | null; order_index?: number }
type Provider = { id: string; name: string }
type Agent = { id: string; name: string; description: string | null; system_prompt: string | null; provider_id: string | null }

function SortableSkill({ skill, onRemove }: { skill: Skill; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: skill.id })
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${isDragging ? 'z-10 opacity-70 shadow-lg' : ''}`}>
    <button type="button" aria-label={`拖动 ${skill.name}`} className="cursor-grab touch-none rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100" {...attributes} {...listeners}>⠿</button>
    <div className="min-w-0 flex-1"><div className="font-medium text-slate-800">{skill.name}</div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{skill.description || '暂无描述'}</p></div>
    <button type="button" onClick={() => onRemove(skill.id)} className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50">移除</button>
  </li>
}

export function AgentCompose({ agent: initialAgent, initialSkills, providers }: { agent: Agent; initialSkills: Skill[]; providers: Provider[] }) {
  const router = useRouter()
  const [agent, setAgent] = useState(initialAgent)
  const [skills, setSkills] = useState<Skill[]>(initialSkills.map((skill) => ({ ...skill, id: skill.skill_id || skill.id })))
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Skill[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingSkills, setSavingSkills] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const selectedIds = useMemo(() => new Set(skills.map((skill) => skill.id)), [skills])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      if (!query.trim()) { setSearchResults([]); return }
      try {
        const response = await fetch(`/api/skills?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        const payload = await response.json()
        setSearchResults(Array.isArray(payload.data) ? payload.data : [])
      } catch { if (!controller.signal.aborted) setSearchResults([]) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSkills((items) => arrayMove(items, items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id)))
  }

  async function saveAgent(event: React.FormEvent) {
    event.preventDefault(); setSavingInfo(true); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(agent.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: agent.name, description: agent.description, system_prompt: agent.system_prompt, provider_id: agent.provider_id }) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'Agent 信息保存失败')
      setAgent((current) => ({ ...current, ...payload.data }))
      setNotice('Agent 信息已保存')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Agent 信息保存失败') }
    finally { setSavingInfo(false) }
  }

  async function saveSkills() {
    setSavingSkills(true); setError(''); setNotice('')
    try {
      const ordered = skills.map((skill, order_index) => ({ skill_id: skill.id, order_index }))
      const response = await fetch(`/api/agents/${encodeURIComponent(agent.id)}/skills`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ordered) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'Skill 组合保存失败')
      setSkills((payload.data as Skill[]).map((skill) => ({ ...skill, id: skill.skill_id || skill.id })))
      setNotice('Skill 组合已保存')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Skill 组合保存失败') }
    finally { setSavingSkills(false) }
  }

  function addSkill(item: Skill) {
    if (selectedIds.has(item.id)) return
    setSkills((current) => [...current, { ...item, id: item.id }])
  }

  return <div className="space-y-8">
    <header><h1 className="text-2xl font-semibold">编排 Agent</h1><p className="mt-1 text-sm text-slate-500">配置基本信息，并按顺序组合 Skills。</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

    <form onSubmit={saveAgent} className="space-y-4 rounded-2xl border border-slate-200 p-5">
      <h2 className="text-lg font-semibold">基本信息</h2>
      <label className="block space-y-1 text-sm">名称<input required value={agent.name} onChange={(event) => setAgent({ ...agent, name: event.target.value })} className="w-full rounded-lg border p-2" /></label>
      <label className="block space-y-1 text-sm">描述<textarea value={agent.description || ''} onChange={(event) => setAgent({ ...agent, description: event.target.value })} rows={2} className="w-full rounded-lg border p-2" /></label>
      <label className="block space-y-1 text-sm">系统提示<textarea value={agent.system_prompt || ''} onChange={(event) => setAgent({ ...agent, system_prompt: event.target.value })} rows={4} className="w-full rounded-lg border p-2" /></label>
      <label className="block space-y-1 text-sm">默认 Provider<select value={agent.provider_id || ''} onChange={(event) => setAgent({ ...agent, provider_id: event.target.value || null })} className="w-full rounded-lg border p-2"><option value="">未设置</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
      <button disabled={savingInfo} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingInfo ? '保存中…' : '保存基本信息'}</button>
    </form>

    <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
      <div><h2 className="text-lg font-semibold">Skill 组合</h2><p className="mt-1 text-sm text-slate-500">拖动排序；至少添加一个 Skill 才能保存。</p></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">搜索 Skills<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入名称或关键词" className="w-full rounded-lg border p-2" /></label>
          <ul className="max-h-96 space-y-2 overflow-auto">{searchResults.filter((item) => !selectedIds.has(item.id)).map((item) => <li key={item.id} className="flex items-start gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="font-medium">{item.name}</div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || '暂无描述'}</p></div><button type="button" onClick={() => addSkill(item)} className="rounded-lg border px-3 py-1 text-sm">添加</button></li>)}</ul>
          {query && searchResults.length === 0 && <p className="text-sm text-slate-400">没有匹配的 Skill。</p>}
        </div>
        <div className="space-y-3">
          {skills.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={skills.map((skill) => skill.id)} strategy={verticalListSortingStrategy}><ol className="space-y-2">{skills.map((skill) => <SortableSkill key={skill.id} skill={skill} onRemove={(id) => setSkills((current) => current.filter((entry) => entry.id !== id))} />)}</ol></SortableContext></DndContext> : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">尚未添加 Skill</div>}
          <button type="button" onClick={() => void saveSkills()} disabled={savingSkills || skills.length === 0} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingSkills ? '保存中…' : '保存 Skill 顺序'}</button>
        </div>
      </div>
    </section>
  </div>
}
