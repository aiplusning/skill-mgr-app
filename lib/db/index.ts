import { mkdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const configuredPath = process.env.DB_PATH || './data/skills.db'
const databasePath = path.resolve(configuredPath)
if (databasePath !== ':memory:') {
  mkdirSync(path.dirname(databasePath), { recursive: true })
}

export const sqlite = new Database(databasePath)
sqlite.pragma('foreign_keys = ON')
export const db = drizzle(sqlite, { schema })

export * from './schema'
