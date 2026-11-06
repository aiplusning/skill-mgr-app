'use client'

import { useCallback, useEffect, useState } from 'react'

type Tool = { id: string; name: string; global_path: string; enabled: number }
type InstallStatus = 'installed' | 'missing' | 'not_installed'
type StatusData = { status: InstallStatus; installed_path: string | null; install_mode: 'symlink' | 'copy' | null }

export function SkillDistribute({ skillId }: { skillId: string }) {
  const [tools, setTools] = useState<Tool[]>([])
  const [statuses, setStatuses] = useState<Record<string, StatusData>>({})
  const [modes, setModes] = useState<Record<string, 'symlink' | 'copy'>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    const response = await fetch('/api/tools', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '工具列表加载失败')
    const activeTools = (payload.data as Tool[]).filter((tool) => Number(tool.enabled) === 1)
    setTools(activeTools)
    const entries = await Promise.all(activeTools.map(async (tool) => {
      const result = await fetch(`/api/skills/${encodeURIComponent(skillId)}/install?tool_id=${encodeURIComponent(tool.id)}`, { cache: 'no-store' })
      const data = await result.json()
      if (!result.ok || !data.ok) throw new Error(data.error?.message || `${tool.name} 状态加载失败`)
      return [tool.id, data.data as StatusData] as const
    }))
    setStatuses(Object.fromEntries(entries))
  }, [skillId])

  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : '分发状态加载失败')) }, [refresh])

  async function installTool(tool: Tool) {
    setBusy(tool.id); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skillId)}/install`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool_id: tool.id, mode: modes[tool.id] || 'symlink' }) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '安装失败')
      setNotice(`已安装到 ${payload.data.installed_path}`)
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '安装失败') }
    finally { setBusy(null) }
  }

  async function uninstallTool(tool: Tool) {
    setBusy(tool.id); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skillId)}/install/${encodeURIComponent(tool.id)}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '卸载失败')
      setNotice('已卸载')
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '卸载失败') }
    finally { setBusy(null) }
  }

  const labels: Record<InstallStatus, string> = { installed: '已安装', missing: '路径失效', not_installed: '未安装' }
  return <section className="space-y-4">
    <div><h2 className="text-lg font-semibold">分发到工具</h2><p className="mt-1 text-sm text-slate-500">安装目录由工具配置决定；卸载仅会移除本应用记录管理的目标。</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {tools.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">没有启用的工具。</p> : <ul className="space-y-3">{tools.map((tool) => {
      const current = statuses[tool.id] || { status: 'not_installed' as const, installed_path: null, install_mode: null }
      return <li key={tool.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${current.status === 'installed' ? 'bg-emerald-500' : current.status === 'missing' ? 'bg-amber-500' : 'bg-slate-300'}`} /><strong>{tool.name}</strong><span className="text-sm text-slate-500">{labels[current.status]}</span></div><p className="mt-1 break-all text-xs text-slate-500">{current.installed_path || tool.global_path}</p></div>
        <select aria-label={`${tool.name} 安装模式`} value={modes[tool.id] || 'symlink'} onChange={(event) => setModes((currentModes) => ({ ...currentModes, [tool.id]: event.target.value as 'symlink' | 'copy' }))} className="rounded-lg border px-2 py-2 text-sm"><option value="symlink">symlink</option><option value="copy">copy</option></select>
        <button type="button" disabled={busy === tool.id || current.status === 'installed'} onClick={() => void installTool(tool)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">安装</button>
        <button type="button" disabled={busy === tool.id || current.status === 'not_installed'} onClick={() => void uninstallTool(tool)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">卸载</button>
      </li>
    })}</ul>}
  </section>
}
