import { homedir } from 'node:os'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { scanSkills } from '@/lib/scanner'
import { PathOutsideRootsError, resolveUnderRoots } from '@/lib/fs-safe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const defaultRoots = [
  path.join(homedir(), '.claude/skills'),
  path.join(homedir(), '.grok/skills'),
  path.join(homedir(), '.agents/skills'),
  path.join(process.cwd(), 'seed/skills'),
]

export async function POST(request: Request) {
  try {
    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      // An empty or omitted request body uses the documented defaults.
    }

    const requestedRoots = typeof body === 'object' && body !== null && 'roots' in body
      ? (body as { roots?: unknown }).roots
      : undefined
    if (requestedRoots !== undefined && (!Array.isArray(requestedRoots) || requestedRoots.some((root) => typeof root !== 'string' || !root.trim()))) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_ROOTS', message: 'roots must be an array of non-empty paths' } }, { status: 400 })
    }

    const roots = requestedRoots === undefined ? defaultRoots : requestedRoots as string[]
    const safeRoots = roots.map((root) => resolveUnderRoots(path.resolve(root), [process.cwd(), homedir()]))
    const result = scanSkills(safeRoots)
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    if (error instanceof PathOutsideRootsError) {
      return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: { code: 'SCAN_FAILED', message: error instanceof Error ? error.message : 'Scan failed' } }, { status: 500 })
  }
}
