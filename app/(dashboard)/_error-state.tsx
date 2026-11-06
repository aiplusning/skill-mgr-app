import type { ReactNode } from 'react'

export function ErrorState({ title = '加载失败', message, action }: { title?: string; message: string; action?: ReactNode }) {
  return <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
    <h2 className="font-semibold">{title}</h2>
    <p className="mt-1 text-sm text-red-800">{message}</p>
    {action && <div className="mt-3">{action}</div>}
  </section>
}
