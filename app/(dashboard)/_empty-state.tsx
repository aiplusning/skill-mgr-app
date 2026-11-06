import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
    <h2 className="font-medium text-slate-800">{title}</h2>
    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </section>
}
