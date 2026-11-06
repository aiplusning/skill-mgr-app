#!/usr/bin/env bun
import { readFileSync } from 'node:fs'

const statusPath = new URL('../docs/task/STATUS.json', import.meta.url)
const status = JSON.parse(readFileSync(statusPath, 'utf8')) as {
  current: string
  tasks: Record<string, { status: string }>
}
const symbols: Record<string, string> = {
  passed: '✓', running: '●', pending: '○', failed: '✗', blocked: '⊘',
}
const ids = Object.keys(status.tasks).sort()
const width = Math.max(4, ...ids.map((id) => id.length))
console.log(`${'任务'.padEnd(width)}  状态`)
for (const id of ids) {
  const taskStatus = status.tasks[id].status
  console.log(`${id.padEnd(width)}  ${symbols[taskStatus] ?? '?'} ${taskStatus}`)
}
const passed = ids.filter((id) => status.tasks[id].status === 'passed').length
console.log(`[${passed}/${ids.length}]  current=${status.current}`)
const blocked = ids.filter((id) => status.tasks[id].status === 'blocked')
if (blocked.length) console.log(`BLOCKED: ${blocked.join(', ')}`)
