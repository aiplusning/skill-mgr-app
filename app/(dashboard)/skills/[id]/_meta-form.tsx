'use client'

import { useEffect, useState } from 'react'

const categories = ['需求分析', '系统架构', '编码', '测试', '产品', '运维', '其他']
interface Option { id: string; name: string }
interface MetaSkill {
  id: string; category: string | null; business_scene: string | null; notes: string | null
  tags: Option[]; projects: Option[]; tools: Option[]
}

function MultiSelect({ label, items, selected, onChange }: { label: string; items: Option[]; selected: string[]; onChange: (value: string[]) => void }) {
  return <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-700">{label}</legend><div className="flex flex-wrap gap-2">{items.map((item) => <label key={item.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />{item.name}</label>)}</div>{items.length === 0 && <p className="text-xs text-slate-500">请先在设置页添加选项。</p>}</fieldset>
}

export function SkillMetaForm({ skill, onSaved }: { skill: MetaSkill; onSaved: (skill: MetaSkill) => void }) {
  const [options, setOptions] = useState<{ tags: Option[]; projects: Option[]; tools: Option[] }>({ tags: [], projects: [], tools: [] })
  const [category, setCategory] = useState(skill.category || '')
  const [businessScene, setBusinessScene] = useState(skill.business_scene || '')
  const [notes, setNotes] = useState(skill.notes || '')
  const [tagIds, setTagIds] = useState(skill.tags.map((item) => item.id))
  const [projectIds, setProjectIds] = useState(skill.projects.map((item) => item.id))
  const [toolIds, setToolIds] = useState(skill.tools.map((item) => item.id))
  const [status, setStatus] = useState('')

  useEffect(() => {
    Promise.all(['tags', 'projects', 'tools'].map(async (key) => {
      const response = await fetch(`/api/${key}`)
      const payload = await response.json()
      return [key, Array.isArray(payload.data) ? payload.data : []] as const
    })).then((entries) => setOptions(Object.fromEntries(entries) as typeof options)).catch(() => setStatus('加载元数据选项失败'))
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setStatus('保存中…')
    const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}/meta`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: category || null, business_scene: businessScene, notes, tag_ids: tagIds, project_ids: projectIds, tool_ids: toolIds }),
    })
    const payload = await response.json()
    if (!response.ok || !payload.ok) { setStatus(payload.error?.message || '保存失败'); return }
    setStatus('元数据已保存')
    onSaved({ ...skill, category, business_scene: businessScene, notes, tags: options.tags.filter((item) => tagIds.includes(item.id)), projects: options.projects.filter((item) => projectIds.includes(item.id)), tools: options.tools.filter((item) => toolIds.includes(item.id)) })
  }

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
    <div><label className="mb-1 block text-sm font-medium text-slate-700">分类</label><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2"><option value="">未分类</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div><label className="mb-1 block text-sm font-medium text-slate-700">业务场景</label><textarea value={businessScene} onChange={(event) => setBusinessScene(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></div>
    <div><label className="mb-1 block text-sm font-medium text-slate-700">备注</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></div>
    <MultiSelect label="标签" items={options.tags} selected={tagIds} onChange={setTagIds} />
    <MultiSelect label="项目" items={options.projects} selected={projectIds} onChange={setProjectIds} />
    <MultiSelect label="支持工具" items={options.tools} selected={toolIds} onChange={setToolIds} />
    <div className="flex items-center gap-3"><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">保存元数据</button><span role="status" className="text-sm text-slate-500">{status}</span></div>
  </form>
}
