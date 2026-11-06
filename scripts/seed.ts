#!/usr/bin/env bun
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { sqlite } from '../lib/db'

const seedRoot = path.resolve('seed/skills')
const demoSkills = [
  { slug: 'demo-alpha', description: '用于演示基础 Skill 扫描与索引的示例。', body: '# Demo Alpha\n\n展示如何将本地 Skill 文件识别并保存到管理器索引中。' },
  { slug: 'demo-beta', description: '用于演示文本整理工作流的示例。', body: '# Demo Beta\n\n帮助将零散想法整理成清晰、可执行的步骤。' },
  { slug: 'demo-gamma', description: '用于演示代码审阅工作流的示例。', body: '# Demo Gamma\n\n审阅代码时先理解目标与边界，再提供可验证的修复建议。' },
  { slug: 'demo-delta', description: '用于演示项目规划工作流的示例。', body: '# Demo Delta\n\n把项目目标拆分为阶段、任务、依赖关系和验收标准。' },
  { slug: 'demo-broken', description: '此示例故意缺少 name 字段，用于验证 invalid 状态。', body: '# Demo Broken\n\n该 Skill 应被扫描器识别并记录为 invalid。', invalid: true },
]

mkdirSync(seedRoot, { recursive: true })
for (const skill of demoSkills) {
  const directory = path.join(seedRoot, skill.slug)
  const file = path.join(directory, 'SKILL.md')
  mkdirSync(directory, { recursive: true })
  const nameLine = skill.invalid ? '' : `name: ${skill.slug}\n`
  if (!await Bun.file(file).exists()) {
    writeFileSync(file, `---\n${nameLine}description: ${skill.description}\n---\n\n${skill.body}\n`, 'utf8')
  }
}

const alpha = sqlite.prepare("SELECT id FROM skills WHERE slug = 'demo-alpha'").get() as { id: string } | undefined
const beta = sqlite.prepare("SELECT id FROM skills WHERE slug = 'demo-beta'").get() as { id: string } | undefined
if (!alpha || !beta) {
  console.log('Demo files are ready. Run `bun run db:migrate` and POST /api/scan before seeding the Agent.')
  sqlite.close()
  process.exit(0)
}

const agentId = randomUUID()
const seed = sqlite.transaction(() => {
  const existing = sqlite.prepare("SELECT id FROM agents WHERE name = 'seed-agent' ORDER BY created_at ASC LIMIT 1").get() as { id: string } | undefined
  const id = existing?.id ?? agentId
  if (!existing) {
    sqlite.prepare(`INSERT INTO agents (id, name, description, system_prompt, provider_id) VALUES (?, ?, ?, ?, NULL)`)
      .run(id, 'seed-agent', '用于演示两个 Skill 组合与测试用例的 Agent。', '遵循组合 Skills 的内容，清晰、准确地完成任务。')
  }
  sqlite.prepare('DELETE FROM agent_skills WHERE agent_id = ?').run(id)
  const insertSkill = sqlite.prepare('INSERT INTO agent_skills (agent_id, skill_id, order_index) VALUES (?, ?, ?)')
  insertSkill.run(id, alpha.id, 0)
  insertSkill.run(id, beta.id, 1)

  const cases = [
    ['seed-case-hello', '问候用例', '用一句话介绍你能如何帮助我。', '简洁友好地回答。'],
    ['seed-case-plan', '计划整理用例', '帮我把“准备一次小型发布”整理成三个步骤。', '步骤应清晰且可执行。'],
  ]
  for (const [marker, name, userInput, expected] of cases) {
    const found = sqlite.prepare('SELECT id FROM test_cases WHERE agent_id = ? AND name = ?').get(id, name)
    if (!found) sqlite.prepare('INSERT INTO test_cases (id, agent_id, name, user_input, expected) VALUES (?, ?, ?, ?, ?)')
      .run(`${marker}-${randomUUID()}`, id, name, userInput, expected)
  }
  return id
})

console.log(`Seeded demo Skills and Agent: ${seed()}`)
sqlite.close()
