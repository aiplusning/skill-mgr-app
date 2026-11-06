'use client'

import { useMemo, useState } from 'react'
import { SkillDistribute } from './_distribute'
import { SkillEditor } from './_editor'
import { SkillMetaForm } from './_meta-form'
import { SkillQuickTest } from './_quick-test'
import { SkillVersions } from './_versions'

const tabs = [
  { id: 'overview', label: '概览' },
  { id: 'editor', label: '编辑' },
  { id: 'versions', label: '变体' },
  { id: 'quick-test', label: '单 Skill 测试' },
  { id: 'distribution', label: '分发' },
] as const

type NamedItem = { id: string; name: string }
type Skill = {
  id: string; slug: string; name: string; description: string | null; status: string | null
  dir_path: string; frontmatter: string | null; category: string | null; business_scene: string | null
  notes: string | null; tags: NamedItem[]; projects: NamedItem[]; tools: NamedItem[]
}

export function SkillDetailTabs({ skill: initialSkill }: { skill: Skill }) {
  const [skill, setSkill] = useState(initialSkill)
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('overview')
  const [editingMeta, setEditingMeta] = useState(false)
  const tags = useMemo(() => skill.tags.map((item) => item.name), [skill.tags])
  const projects = useMemo(() => skill.projects.map((item) => item.name), [skill.projects])
  const tools = useMemo(() => skill.tools.map((item) => item.name), [skill.tools])

  return <div className="space-y-6">
    <header className="border-b border-slate-200 pb-5"><div className="mb-2 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">{skill.status || 'unknown'}</div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{skill.name}</h1><p className="mt-2 text-sm text-slate-500">{skill.description || '暂无描述'}</p></header>
    <nav className="flex flex-wrap gap-2" aria-label="Skill 页面选项卡">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined} className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab.label}</button>)}</nav>
    {activeTab === 'overview' ? <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-slate-50 p-4"><div className="text-xs uppercase text-slate-400">slug</div><div className="mt-2 font-medium">{skill.slug}</div></div><div className="rounded-2xl border bg-slate-50 p-4"><div className="text-xs uppercase text-slate-400">directory</div><div className="mt-2 break-all font-medium">{skill.dir_path}</div></div></div>
      <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer text-sm font-medium text-slate-700">Frontmatter 原文</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-200">{skill.frontmatter || '无 frontmatter'}</pre></details>
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">元数据</h2><button type="button" onClick={() => setEditingMeta((value) => !value)} className="rounded-lg border px-3 py-2 text-sm">{editingMeta ? '取消编辑' : '编辑元数据'}</button></div>
      {editingMeta ? <SkillMetaForm skill={skill as never} onSaved={(updated) => { setSkill((current) => ({ ...current, ...updated })); setEditingMeta(false) }} /> : <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-4"><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt>category</dt><dd>{skill.category || '—'}</dd></div><div className="flex justify-between"><dt>business scene</dt><dd>{skill.business_scene || '—'}</dd></div><div className="flex justify-between"><dt>tags</dt><dd>{tags.join(', ') || '—'}</dd></div><div className="flex justify-between"><dt>projects</dt><dd>{projects.join(', ') || '—'}</dd></div><div className="flex justify-between"><dt>tools</dt><dd>{tools.join(', ') || '—'}</dd></div></dl></div><div className="rounded-2xl border bg-white p-4"><h3 className="mb-3 text-sm font-medium">备注</h3><div className="text-sm leading-6 text-slate-600">{skill.notes || '暂无备注'}</div></div></div>}
    </div> : activeTab === 'editor' ? <SkillEditor skillId={skill.id} /> : activeTab === 'versions' ? <SkillVersions skillId={skill.id} /> : activeTab === 'quick-test' ? <SkillQuickTest skillId={skill.id} /> : <SkillDistribute skillId={skill.id} />}
  </div>
}
