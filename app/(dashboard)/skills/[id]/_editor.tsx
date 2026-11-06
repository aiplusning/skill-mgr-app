'use client'

import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { yaml } from '@codemirror/lang-yaml'
import { useEffect, useRef, useState } from 'react'

type SaveMode = 'file' | 'draft' | 'export'

export function SkillEditor({ skillId }: { skillId: string }) {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<SaveMode | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dialog, setDialog] = useState<SaveMode | null>(null)
  const [note, setNote] = useState('')
  const [targetDir, setTargetDir] = useState('')
  const dirty = content !== savedContent
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/skills/${encodeURIComponent(skillId)}/file`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '无法加载 Skill 文件')
        setContent(payload.data.content)
        setSavedContent(payload.data.content)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '无法加载 Skill 文件')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => {
      if (dirtyRef.current && !window.confirm('编辑内容尚未保存，确定离开吗？')) return
      controller.abort()
    }
  }, [skillId])

  async function save(mode: SaveMode) {
    setSaving(mode)
    setError('')
    setMessage('')
    const endpoint = mode === 'file'
      ? `/api/skills/${encodeURIComponent(skillId)}/file`
      : mode === 'draft'
        ? `/api/skills/${encodeURIComponent(skillId)}/versions`
        : `/api/skills/${encodeURIComponent(skillId)}/export`
    const method = mode === 'file' ? 'PUT' : 'POST'
    const body = mode === 'draft' ? { content, note } : mode === 'export' ? { content, targetDir } : { content }
    try {
      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '保存失败')
      if (mode === 'file') setSavedContent(content)
      if (mode === 'draft') setMessage(`已存为变体 ${payload.data.version_id}`)
      if (mode === 'export') setMessage(`已导出：${payload.data.path}`)
      if (mode === 'file') setMessage('已保存到 SKILL.md')
      setDialog(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <span className={dirty ? 'text-amber-700' : 'text-slate-500'}>{dirty ? '未保存' : '已同步'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={loading || !!saving} onClick={() => void save('file')} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">保存到文件</button>
          <button type="button" disabled={loading || !!saving} onClick={() => setDialog('draft')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">存为草稿</button>
          <button type="button" disabled={loading || !!saving} onClick={() => setDialog('export')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">另存为…</button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {loading ? <div className="p-8 text-center text-sm text-slate-500">正在加载文件…</div> : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <CodeMirror value={content} height="520px" extensions={[markdown(), yaml()]} onChange={setContent} theme="light" />
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="save-dialog-title" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="save-dialog-title" className="text-lg font-semibold">{dialog === 'draft' ? '保存为 SQLite 草稿' : '导出到目录'}</h2>
            {dialog === 'draft' ? (
              <label className="block space-y-1 text-sm text-slate-700">备注<input value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="可选备注" /></label>
            ) : (
              <label className="block space-y-1 text-sm text-slate-700">目标目录<input value={targetDir} onChange={(event) => setTargetDir(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="/absolute/path/to/skills" /></label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">取消</button>
              <button type="button" disabled={!!saving} onClick={() => void save(dialog)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? '保存中…' : '确认'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
