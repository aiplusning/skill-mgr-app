'use client'

import { useCallback, useEffect, useState } from 'react'

type TestCase = { id: string; name: string; user_input: string }
type Run = {
  id: string
  case_id: string
  model: string
  with_agent: number
  output: string | null
  input_tokens: number | null
  output_tokens: number | null
  latency_ms: number | null
  score: number | null
  score_note: string | null
  error: string | null
  created_at: number
}

type CaseHistory = { testCase: TestCase; runs: Run[] }

export function AgentRunsHistory({ agentId }: { agentId: string }) {
  const [groups, setGroups] = useState<CaseHistory[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { score: number | null; note: string }>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const casesResponse = await fetch(`/api/agents/${encodeURIComponent(agentId)}/cases`, { cache: 'no-store' })
      const casesPayload = await casesResponse.json()
      if (!casesResponse.ok || !casesPayload.ok) throw new Error(casesPayload.error?.message || '用例历史加载失败')
      const testCases = Array.isArray(casesPayload.data) ? casesPayload.data as TestCase[] : []
      const result = await Promise.all(testCases.map(async (testCase) => {
        const response = await fetch(`/api/cases/${encodeURIComponent(testCase.id)}/runs`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload.ok) throw new Error(payload.error?.message || `用例“${testCase.name}”运行记录加载失败`)
        return { testCase, runs: (Array.isArray(payload.data) ? payload.data : []) as Run[] }
      }))
      setGroups(result.filter((group) => group.runs.length > 0))
      setDrafts((current) => {
        const next = { ...current }
        for (const group of result) for (const run of group.runs) {
          if (!next[run.id]) next[run.id] = { score: run.score, note: run.score_note || '' }
        }
        return next
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '运行历史加载失败')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { void loadHistory() }, [loadHistory])

  async function saveScore(run: Run) {
    const draft = drafts[run.id] ?? { score: run.score, note: run.score_note || '' }
    if (draft.score === null) {
      setError('请先选择 1–5 星评分。')
      return
    }
    setSavingId(run.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(run.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: draft.score, score_note: draft.note }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '评分保存失败')
      setNotice('评分已保存')
      await loadHistory()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '评分保存失败')
    } finally {
      setSavingId(null)
    }
  }

  return <section className="space-y-4 border-t border-slate-200 pt-6">
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="text-lg font-semibold">运行历史与评分</h3><p className="mt-1 text-sm text-slate-500">按测试用例查看记录，可展开输出并保存人工评分。</p></div>
      <button type="button" onClick={() => void loadHistory()} disabled={loading} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">刷新</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {loading ? <p className="p-6 text-center text-sm text-slate-500">正在加载历史记录…</p> : groups.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">暂无运行历史。</p> : <div className="space-y-5">
      {groups.map(({ testCase, runs }) => <section key={testCase.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <header><h4 className="font-semibold">{testCase.name}</h4><p className="mt-1 text-sm text-slate-500">{testCase.user_input}</p></header>
        <ol className="space-y-3">
          {runs.map((run) => {
            const draft = drafts[run.id] ?? { score: run.score, note: run.score_note || '' }
            const isExpanded = expanded === run.id
            return <li key={run.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <button type="button" onClick={() => setExpanded(isExpanded ? null : run.id)} aria-expanded={isExpanded} className="text-left">
                  <span className="font-medium text-slate-800">{run.model} · {run.with_agent ? 'with_agent' : 'baseline'}</span>
                  <span className="mt-1 block text-xs text-slate-500">{new Date(Number(run.created_at) * 1000).toLocaleString()} · {run.latency_ms ?? '—'} ms · 评分：{run.score ? `${run.score}/5` : '未评分'}</span>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <div role="radiogroup" aria-label="1 到 5 星评分" className="flex items-center">
                    {[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" role="radio" aria-checked={draft.score === score} aria-label={`${score} 星`} onClick={() => setDrafts((current) => ({ ...current, [run.id]: { ...draft, score } }))} className={`px-0.5 text-xl ${draft.score !== null && score <= draft.score ? 'text-amber-500' : 'text-slate-300'}`}>★</button>)}
                  </div>
                  <input value={draft.note} onChange={(event) => setDrafts((current) => ({ ...current, [run.id]: { ...draft, note: event.target.value } }))} aria-label="评分备注" placeholder="评分备注" className="w-36 rounded-lg border bg-white px-2 py-1.5 text-xs" />
                  <button type="button" disabled={savingId === run.id || draft.score === null} onClick={() => void saveScore(run)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{savingId === run.id ? '保存中…' : '保存评分'}</button>
                </div>
              </div>
              {isExpanded && <div className="mt-3 space-y-2 border-t border-slate-200 pt-3"><p className="text-xs text-slate-500">输入 {run.input_tokens ?? '—'} tokens · 输出 {run.output_tokens ?? '—'} tokens</p><pre className="whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-sm text-slate-700">{run.error || run.output || '（空输出）'}</pre></div>}
            </li>
          })}
        </ol>
      </section>)}
    </div>}
  </section>
}
