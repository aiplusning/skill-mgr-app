'use client'

import { useMemo, useState } from 'react'

const tabs = [
  { id: 'overview', label: '概览' },
  { id: 'editor', label: '编辑' },
  { id: 'versions', label: '变体' },
  { id: 'quick-test', label: '单 Skill 测试' },
  { id: 'distribution', label: '分发' },
] as const

export function SkillDetailTabs({ skill }: { skill: any }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('overview')

  const tags = useMemo(() => (skill?.tags ?? []).map((tag: { name: string }) => tag.name), [skill])
  const projects = useMemo(() => (skill?.projects ?? []).map((project: { name: string }) => project.name), [skill])
  const tools = useMemo(() => (skill?.tools ?? []).map((tool: { name: string }) => tool.name), [skill])

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <div className="mb-2 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
          {skill.status || 'unknown'}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{skill.name}</h1>
        <p className="mt-2 text-sm text-slate-500">{skill.description || '暂无描述'}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.1em] text-slate-400">slug</div>
              <div className="mt-2 text-base font-medium text-slate-900">{skill.slug}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.1em] text-slate-400">directory</div>
              <div className="mt-2 break-all text-base font-medium text-slate-900">{skill.dir_path}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium text-slate-700">frontmatter</div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
              {skill.frontmatter || '无 frontmatter'}
            </pre>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-medium text-slate-700">元数据</div>
              <dl className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <dt>category</dt>
                  <dd className="font-medium text-slate-900">{skill.category || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>tags</dt>
                  <dd className="font-medium text-slate-900">{tags.length ? tags.join(', ') : '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>projects</dt>
                  <dd className="font-medium text-slate-900">{projects.length ? projects.join(', ') : '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>tools</dt>
                  <dd className="font-medium text-slate-900">{tools.length ? tools.join(', ') : '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-medium text-slate-700">备注</div>
              <div className="text-sm leading-6 text-slate-600">{skill.notes || '暂无备注'}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          {activeTab === 'editor' && '编辑器功能正在建设中'}
          {activeTab === 'versions' && '版本管理功能正在建设中'}
          {activeTab === 'quick-test' && '单 Skill 测试功能正在建设中'}
          {activeTab === 'distribution' && '分发视图功能正在建设中'}
        </div>
      )}
    </div>
  )
}
