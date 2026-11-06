'use client'

import { useState } from 'react'

type Provider = { id: string; name: string }

export function SkillQuickTest({ skillId, providers = [] }: { skillId: string; providers?: Provider[] }) {
  const [userInput, setUserInput] = useState('')
  const [providerId, setProviderId] = useState('')
  const [output, setOutput] = useState('')
  const [latency, setLatency] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setOutput('')
    setLatency(null)
    setError('')
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skillId)}/quick-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: userInput, ...(providerId ? { provider_id: providerId } : {}) }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '测试运行失败')
      setOutput(payload.data.output || '（空输出）')
      setLatency(payload.data.latency_ms)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '测试运行失败')
    } finally {
      setBusy(false)
    }
  }

  return <section className="space-y-4">
    <div>
      <h2 className="text-lg font-semibold">单 Skill 快速测试</h2>
      <p className="mt-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">该次调用会消耗 token。测试结果不会保存到运行历史。</p>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={run} className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <label className="block space-y-1 text-sm font-medium text-slate-700">输入<textarea required value={userInput} onChange={(event) => setUserInput(event.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 p-3 font-normal" placeholder="输入本次测试的问题或任务" /></label>
      {providers.length > 0 && <label className="block space-y-1 text-sm font-medium text-slate-700">Provider（可选）<select value={providerId} onChange={(event) => setProviderId(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2 font-normal"><option value="">使用默认启用的 Provider</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>}
      <button type="submit" disabled={busy || !userInput.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? '运行中…' : '运行测试'}</button>
    </form>
    {(output || latency !== null) && <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="font-medium">输出</h3>{latency !== null && <span className="text-xs text-slate-500">耗时 {latency} ms</span>}</div><pre className="whitespace-pre-wrap break-words text-sm text-slate-700">{output}</pre></div>}
  </section>
}
