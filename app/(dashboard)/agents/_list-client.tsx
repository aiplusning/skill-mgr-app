'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Provider = { id: string; name: string }

export function AgentsListClient({ providers }: { providers: Provider[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [providerId, setProviderId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function createAgent(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, system_prompt: systemPrompt, provider_id: providerId || null }) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'Agent 创建失败')
      setOpen(false)
      router.push(`/agents/${payload.data.id}`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Agent 创建失败') }
    finally { setBusy(false) }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">新建 Agent</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <form onSubmit={createAgent} role="dialog" aria-modal="true" aria-labelledby="new-agent-title" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="new-agent-title" className="text-lg font-semibold">新建 Agent</h2>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <label className="block space-y-1 text-sm">名称<input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border p-2" /></label>
        <label className="block space-y-1 text-sm">描述<input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border p-2" /></label>
        <label className="block space-y-1 text-sm">系统提示<textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={3} className="w-full rounded-lg border p-2" /></label>
        <label className="block space-y-1 text-sm">默认 Provider<select value={providerId} onChange={(event) => setProviderId(event.target.value)} className="w-full rounded-lg border p-2"><option value="">未设置</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-2 text-sm">取消</button><button disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? '创建中…' : '创建'}</button></div>
      </form>
    </div>}
  </>
}
