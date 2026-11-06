'use client'

import { useCallback, useEffect, useState } from 'react'

type Version = {
  id: string
  skill_id: string
  content: string
  note: string | null
  created_at: number
}

type RestoreMode = 'file' | 'draft'

export function SkillVersions({ skillId }: { skillId: string }) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState<Version | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<Version | null>(null)
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('draft')
  const [busy, setBusy] = useState(false)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skillId)}/versions`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '无法加载变体')
      setVersions(Array.isArray(payload.data) ? payload.data : [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法加载变体')
    } finally {
      setLoading(false)
    }
  }, [skillId])

  useEffect(() => { void loadVersions() }, [loadVersions])

  async function removeVersion(version: Version) {
    if (!window.confirm('确定删除这个变体吗？此操作无法撤销。')) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(version.id)}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '删除失败')
      setNotice('变体已删除')
      await loadVersions()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  async function restore() {
    if (!restoreVersion) return
    if (restoreMode === 'file' && !window.confirm('将覆盖当前 SKILL.md。系统会先创建当前文件的备份，确定继续吗？')) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(restoreVersion.id)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: restoreMode }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '恢复失败')
      setRestoreVersion(null)
      setNotice(restoreMode === 'file' ? '已恢复到文件；恢复前的内容已备份为变体。' : '已将变体另存为新草稿。')
      await loadVersions()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '恢复失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Skill 变体</h2>
          <p className="mt-1 text-sm text-slate-500">SQLite 保存的草稿和恢复前备份。</p>
        </div>
        <button type="button" onClick={() => void loadVersions()} disabled={loading || busy} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">刷新</button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {loading ? <p className="p-8 text-center text-sm text-slate-500">正在加载变体…</p> : versions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">还没有保存的变体。</div>
      ) : (
        <ul className="space-y-3">
          {versions.map((version) => (
            <li key={version.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{version.note || '未备注变体'}</span>
                    <time className="text-xs text-slate-400" dateTime={new Date(Number(version.created_at) * 1000).toISOString()}>
                      {new Date(Number(version.created_at) * 1000).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-2 break-all text-sm text-slate-500">{version.content.slice(0, 80)}{version.content.length > 80 ? '…' : ''}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setPreview(version)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">预览</button>
                  <button type="button" onClick={() => { setRestoreVersion(version); setRestoreMode('draft') }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">恢复</button>
                  <button type="button" onClick={() => void removeVersion(version)} disabled={busy} className="rounded-lg border border-red-100 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50">删除</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(preview || restoreVersion) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) { setPreview(null); setRestoreVersion(null) } }}>
          <div role="dialog" aria-modal="true" aria-labelledby="versions-dialog-title" className="max-h-[85vh] w-full max-w-3xl space-y-4 overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            {preview ? <>
              <div className="flex items-center justify-between gap-3"><h3 id="versions-dialog-title" className="text-lg font-semibold">{preview.note || '变体预览'}</h3><button type="button" onClick={() => setPreview(null)} className="rounded-lg border px-3 py-1.5 text-sm">关闭</button></div>
              <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{preview.content}</pre>
            </> : restoreVersion ? <>
              <h3 id="versions-dialog-title" className="text-lg font-semibold">恢复变体</h3>
              <p className="text-sm text-slate-600">{restoreVersion.note || '未备注变体'}</p>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-700">恢复方式</legend>
                <label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="restore-mode" checked={restoreMode === 'draft'} onChange={() => setRestoreMode('draft')} /><span><strong>仅保存为新草稿</strong><span className="block text-slate-500">不更改当前文件，原变体也会保留。</span></span></label>
                <label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="restore-mode" checked={restoreMode === 'file'} onChange={() => setRestoreMode('file')} /><span><strong>写回 SKILL.md</strong><span className="block text-slate-500">覆盖前会自动备份当前文件内容。</span></span></label>
              </fieldset>
              <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setRestoreVersion(null)} className="rounded-lg border px-3 py-2 text-sm">取消</button><button type="button" disabled={busy} onClick={() => void restore()} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? '处理中…' : '确认恢复'}</button></div>
            </> : null}
          </div>
        </div>
      )}
    </section>
  )
}
