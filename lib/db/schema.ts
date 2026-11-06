import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const createdAt = () => integer('created_at').notNull().default(sql`(unixepoch())`)
const updatedAt = () => integer('updated_at').notNull().default(sql`(unixepoch())`)

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  frontmatter: text('frontmatter'),
  body: text('body'),
  dirPath: text('dir_path').notNull().unique(),
  source: text('source').default('local'),
  category: text('category'),
  businessScene: text('business_scene'),
  notes: text('notes'),
  installCount: integer('install_count').default(0),
  fileMtime: integer('file_mtime'),
  fileHash: text('file_hash'),
  gitRemote: text('git_remote'),
  gitBranch: text('git_branch'),
  status: text('status').default('ok'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index('skills_name_idx').on(table.name)])

export const skillVersions = sqliteTable('skill_versions', {
  id: text('id').primaryKey(),
  skillId: text('skill_id').references(() => skills.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  note: text('note'),
  createdAt: createdAt(),
}, (table) => [index('skill_versions_skill_id_idx').on(table.skillId)])

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: createdAt(),
})

export const skillTags = sqliteTable('skill_tags', {
  skillId: text('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.skillId, table.tagId] }), index('skill_tags_tag_id_idx').on(table.tagId)])

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  path: text('path'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const skillProjects = sqliteTable('skill_projects', {
  skillId: text('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.skillId, table.projectId] }), index('skill_projects_project_id_idx').on(table.projectId)])

export const tools = sqliteTable('tools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  globalPath: text('global_path').notNull(),
  projectPath: text('project_path').notNull(),
  enabled: integer('enabled').notNull().default(1),
})

export const skillTools = sqliteTable('skill_tools', {
  skillId: text('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  toolId: text('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.skillId, table.toolId] }), index('skill_tools_tool_id_idx').on(table.toolId)])

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key').notNull(),
  model: text('model').notNull(),
  enabled: integer('enabled').default(1),
})

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt'),
  providerId: text('provider_id').references(() => providers.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const agentSkills = sqliteTable('agent_skills', {
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
}, (table) => [
  primaryKey({ columns: [table.agentId, table.skillId] }),
  uniqueIndex('agent_skills_order_unique').on(table.agentId, table.orderIndex),
  index('agent_skills_skill_id_idx').on(table.skillId),
])

export const testCases = sqliteTable('test_cases', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  userInput: text('user_input').notNull(),
  context: text('context'),
  expected: text('expected'),
  createdAt: createdAt(),
}, (table) => [index('test_cases_agent_id_idx').on(table.agentId)])

export const testRuns = sqliteTable('test_runs', {
  id: text('id').primaryKey(),
  caseId: text('case_id').references(() => testCases.id, { onDelete: 'cascade' }),
  providerId: text('provider_id'),
  model: text('model').notNull(),
  withAgent: integer('with_agent').notNull(),
  skillSnapshot: text('skill_snapshot').notNull(),
  systemPrompt: text('system_prompt'),
  output: text('output'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  latencyMs: integer('latency_ms'),
  score: integer('score'),
  scoreNote: text('score_note'),
  error: text('error'),
  createdAt: createdAt(),
}, (table) => [index('test_runs_case_id_idx').on(table.caseId)])
