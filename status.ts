#!/usr/bin/env bun
import fs from 'fs'
const s = JSON.parse(fs.readFileSync('docs/STATUS.json', 'utf8'))
const sym: Record<string,string> = {
    passed:'✓', running:'●', pending:'○', failed:'✗', blocked:'⊘'
}
const ids = Object.keys(s.tasks).sort()
const line = ids.map(id => `${id} ${sym[s.tasks[id].status] ?? '?'}`).join('  ')
const passed = ids.filter(id => s.tasks[id].status === 'passed').length
console.log(line)
console.log(`[${passed}/${ids.length}]  current=${s.current}`)
const blocked = ids.filter(id => s.tasks[id].status === 'blocked')
if (blocked.length) console.log('BLOCKED:', blocked.join(', '))