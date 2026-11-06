import Link from 'next/link'
import type { ReactNode } from 'react'

const navItems = [
  { href: '/skills', label: 'Skills' },
  { href: '/agents', label: 'Agents' },
  { href: '/settings', label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">S</div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Skill Manager</div>
              <div className="text-xs text-slate-500">Local workspace</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  )
}
