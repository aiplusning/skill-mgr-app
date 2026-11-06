'use client'

import { useCallback, useEffect, useState } from 'react'
import { RunCompare } from './_run-compare'

type TestCase = { id: string; name: string; user_input: string; context: string | null; expected: string | null; created_at: number }
type RunResult = { id: string; with_agent: number; output?: string | null; error?: string | null }

export function AgentCases({ agentId }: { agentId: string }) {
  const [cases, setCases] = useState<TestCase[]>([])
  const [name, setName] = useState('')
  const [userInput, setUserInput] = useState('')
  const [context, setContext] = useState('')
  const [expected, setExpected] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [latestRuns, setLatestRuns] = useState<Record<string, RunResult>>({})
  const [preview, setPreview] = useState<{ caseId: string; prompt: string } | null>(null)

  const loadCases = useCallback(async () => {
    const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/cases`, { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '用例加载失败')
    setCases(Array.isArray(payload.data) ? payload.data : [])
  }, [agentId])

  useEffect(() => { void loadCases().catch((cause) => setError(cause instanceof Error ? cause.message : '用例加载失败')) }, [loadCases])

  async function createCase(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, user_input: userInput, context, expected }) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '用例创建失败')
      setName(''); setUserInput(''); setContext(''); setExpected(''); setMessage('用例已创建')
      await loadCases()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '用例创建失败') }
    finally { setBusy(false) }
  }

  async function run(testCase: TestCase, withAgent: boolean) {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(testCase.id)}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ with_agent: withAgent }) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '运行失败')
      setLatestRuns((current) => ({ ...current, [testCase.id]: payload.data }))
      setMessage(withAgent ? 'Agent 运行完成' : 'Baseline 运行完成')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '运行失败') }
    finally { setBusy(false) }
  }

  async function previewPrompt(testCase: TestCase) {
    setError('')
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(testCase.id)}/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ with_agent: true }) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'Prompt 预览失败')
      setPreview({ caseId: testCase.id, prompt: payload.data.system_prompt })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Prompt 预览失败') }
  }

  async function deleteCase(testCase: TestCase) {
    if (!window.confirm(`删除用例“${testCase.name}”及其运行历史？`)) return
    const response = await fetch(`/api/cases/${encodeURIComponent(testCase.id)}`, { method: 'DELETE' })
    const payload = await response.json()
    if (!response.ok || !payload.ok) { setError(payload.error?.message || '删除失败'); return }
    await loadCases()
  }

  return <section className="space-y-5 border-t border-slate-200 pt-7">
    <header><h2 className="text-xl font-semibold">测试用例</h2><p className="mt-1 text-sm text-slate-500">比较 Agent 组合与不带 Skill 的 baseline 输出。</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <form onSubmit={createCase} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
      <label className="space-y-1 text-sm">用例名称<input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border p-2" /></label>
      <label className="space-y-1 text-sm">用户输入<input required value={userInput} onChange={(event) => setUserInput(event.target.value)} className="w-full rounded-lg border p-2" /></label>
      <label className="space-y-1 text-sm">上下文（可选）<textarea value={context} onChange={(event) => setContext(event.target.value)} rows={2} className="w-full rounded-lg border p-2" /></label>
      <label className="space-y-1 text-sm">期望描述（可选）<textarea value={expected} onChange={(event) => setExpected(event.target.value)} rows={2} className="w-full rounded-lg border p-2" /></label>
      <div className="md:col-span-2"><button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">新建用例</button></div>
    </form>

    {cases.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">暂无测试用例。</p> : <div className="space-y-4">
      {cases.map((testCase) => <article key={testCase.id} className="space-y-4 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{testCase.name}</h3><p className="mt-1 text-sm text-slate-700">{testCase.user_input}</p>{testCase.context && <p className="mt-1 text-xs text-slate-500">上下文：{testCase.context}</p>}{testCase.expected && <p className="mt-1 text-xs text-slate-500">期望：{testCase.expected}</p>}</div><button type="button" onClick={() => void deleteCase(testCase)} className="text-sm text-red-600">删除</button></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void run(testCase, true)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">运行 with_agent</button><button type="button" disabled={busy} onClick={() => void run(testCase, false)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">运行 baseline</button><button type="button" onClick={() => void previewPrompt(testCase)} className="rounded-lg border px-3 py-2 text-sm">预览 Prompt</button></div>
        {latestRuns[testCase.id] && <div className="rounded-xl bg-slate-50 p-3 text-sm"><strong>本次运行：</strong>{latestRuns[testCase.id].error || latestRuns[testCase.id].output || '（空输出）'}</div>}
        <RunCompare caseId={testCase.id} />
      </article>)}
    </div>}

    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null) }}><div role="dialog" aria-modal="true" aria-labelledby="prompt-preview-title" className="max-h-[85vh] w-full max-w-3xl space-y-3 overflow-auto rounded-2xl bg-white p-5"><div className="flex justify-between"><h3 id="prompt-preview-title" className="font-semibold">将发送的 System Prompt</h3><button type="button" onClick={() => setPreview(null)} className="rounded border px-2 py-1 text-sm">关闭</button></div><pre className="whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{preview.prompt || '（空 Prompt）'}</pre></div></div>}
  </section>
}
