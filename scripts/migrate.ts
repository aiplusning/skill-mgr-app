import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomUUID } from 'node:crypto'
import { createFts } from '../lib/db/fts'
import { db, sqlite } from '../lib/db'

try {
  migrate(db, { migrationsFolder: './drizzle' })
  createFts(sqlite)

  const insertTools = sqlite.prepare(`
    INSERT INTO tools (id, name, global_path, project_path, enabled)
    VALUES (?, ?, ?, ?, 1)
  `)
  const seedTools = sqlite.transaction(() => {
    if ((sqlite.prepare('SELECT COUNT(*) AS count FROM tools').get() as { count: number }).count === 0) {
      const tools = [
        ['claude-code', 'Claude Code', '~/.claude/skills', './.claude/skills'],
        ['grok', 'Grok', '~/.grok/skills', './.grok/skills'],
        ['agents', 'Agents', '~/.agents/skills', './.agents/skills'],
        ['cursor', 'Cursor', '~/.cursor/skills', './.cursor/skills'],
      ]
      for (const [id, name, globalPath, projectPath] of tools) {
        insertTools.run(id, name, globalPath, projectPath)
      }
    }

    const providerCount = (sqlite.prepare('SELECT COUNT(*) AS count FROM providers').get() as { count: number }).count
    if (providerCount === 0) {
      sqlite.prepare(`
        INSERT INTO providers (id, name, base_url, api_key, model, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('grok-default', 'Grok', 'https://api.x.ai/v1', '', 'grok-4', 0)
    }
  })
  seedTools()
  console.log('Database migrations and seed data completed.')
} finally {
  sqlite.close()
}
