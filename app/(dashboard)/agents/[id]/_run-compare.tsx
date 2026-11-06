'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Run = { id: string; with_agent: number; output: string | null; input_tokens: number | null; output_tokens: number | null; latency_ms: number | null; error: string | null; created_at: number; model: string }

function RunPanel({ title, run }: { title: string; run?: Run }) {
  return <section className="min-w-0 rounded-xl border border-slate-200 p-3"><h4 className="font-medium">{title}</h4>{!run ? <p className="mt-2 text-sm text-slate-400">尚无运行记录</p> : <><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{run.error || run.output || '（空输出）'}</p><p className="mt-3 text-xs text-slate-500">{run.model} · 输入 {run.input_tokens ?? '—'} tokens · 输出 {run.output_tokens ?? '—'} tokens · {run.latency_ms ?? '—'} ms</p></>}</section>
}

export function RunCompare({ caseId }: { caseId: string }) {
  const [runs, setRuns] = useState<Run[]>([])
  const [selectedAgentRun, setSelectedAgentRun] = useState('')
  const [selectedBaselineRun, setSelectedBaselineRun] = useState('')
  const [error, setError] = useState('')
  const loadRuns = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/runs`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '运行历史加载失败')
      const list = (Array.isArray(payload.data) ? payload.data : []) as Run[]
      setRuns(list)
      setSelectedAgentRun((current) => current && list.some((run) => run.id === current && run.with_agent === 1) ? current : list.find((run) => run.with_agent === 1)?.id || '')
      setSelectedBaselineRun((current) => current && list.some((run) => run.id === current && run.with_agent === 0) ? current : list.find((run) => run.with_agent === 0)?.id || '')
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '运行历史加载失败') }
  }, [caseId])
  useEffect(() => { void loadRuns() }, [loadRuns])

  const agentRuns = useMemo(() => runs.filter((run) => run.with_agent === 1), [runs])
  const baselineRuns = useMemo(() => runs.filter((run) => run.with_agent === 0), [runs])
  const agentRun = agentRuns.find((run) => run.id === selectedAgentRun) || agentRuns[0]
  const baselineRun = baselineRuns.find((run) => run.id === selectedBaselineRun) || baselineRuns[0]

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">运行对比</h3><button type="button" onClick={() => void loadRuns()} className="rounded border px-2 py-1 text-xs">刷新历史</button></div>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    <div className="grid gap-3 md:grid-cols-2"><div className="space-y-2"><label className="text-xs text-slate-500">Agent 历史<select value={selectedAgentRun || agentRun?.id || ''} onChange={(event) => setSelectedAgentRun(event.target.value)} className="ml-2 max-w-full rounded border p-1">{agentRuns.map((run) => <option key={run.id} value={run.id}>{new Date(Number(run.created_at) * 1000).toLocaleString()} · {run.model}</option>)}</select></label><RunPanel title="with_agent" run={agentRun} /></div><div className="space-y-2"><label className="text-xs text-slate-500">Baseline 历史<select value={selectedBaselineRun || baselineRun?.id || ''} onChange={(event) => setSelectedBaselineRun(event.target.value)} className="ml-2 max-w-full rounded border p-1">{baselineRuns.map((run) => <option key={run.id} value={run.id}>{new Date(Number(run.created_at) * 1000).toLocaleString()} · {run.model}</option>)}</select></label><RunPanel title="baseline" run={baselineRun} /></div></div>
  </div>
}
