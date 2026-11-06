
---

### 文件：`docs/tasks/T02-db-init.md`

```markdown
# T02 · DB + Drizzle + Migration

## 依赖
- T01

## 先读
- docs/REQUIREMENTS.md §2.2（SQLite Schema）
- docs/REQUIREMENTS.md §三（技术选型）

## 产出（文件清单）
- lib/db/schema.ts
- lib/db/index.ts
- lib/db/fts.ts
- drizzle.config.ts
- drizzle/0000_init.sql
- scripts/migrate.ts
- package.json（新增 db:migrate 脚本）

## 步骤
1. 安装依赖：`bun add drizzle-orm better-sqlite3`、`bun add -d drizzle-kit @types/better-sqlite3`。
2. 按 §2.2 在 `lib/db/schema.ts` 中**逐表**定义 drizzle schema，字段名、类型、默认值、外键必须与 SQL 完全一致；`tags`、`skill_tags`、`projects`、`skill_projects`、`tools`、`skill_tools` 六张表按 schema 注释中的关联关系补全字段（不得新增未列出的业务字段）。
3. `lib/db/index.ts` 创建 better-sqlite3 连接，路径读 `process.env.DB_PATH || './data/skills.db'`，导出 `db` 与 drizzle 实例。启动时若 `data/` 不存在则 `mkdirSync`。
4. `drizzle.config.ts` 指向 `lib/db/schema.ts`，dialect=sqlite，out=`./drizzle`。
5. 执行 `bunx drizzle-kit generate` 生成 `drizzle/0000_init.sql`。
6. `lib/db/fts.ts` 导出 `createFts()`：用 `db.exec` 执行 `CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(name, description, body, business_scene, content='skills', content_rowid='rowid');` 以及三条 `CREATE TRIGGER`（INSERT/UPDATE/DELETE 同步 FTS）。
7. `scripts/migrate.ts`：先跑 drizzle migration，再调 `createFts()`，最后在 `tools` 为空时插入 4 条预置数据：
   - `claude-code` / `~/.claude/skills` / `./.claude/skills`
   - `grok` / `~/.grok/skills` / `./.grok/skills`
   - `agents` / `~/.agents/skills` / `./.agents/skills`
   - `cursor` / `~/.cursor/skills` / `./.cursor/skills`
   再插入 1 条 `providers` 占位：`{id:'grok-default', name:'Grok', base_url:'https://api.x.ai/v1', api_key:'', model:'grok-4', enabled:0}`。
8. `package.json` 加脚本：`"db:migrate": "bun scripts/migrate.ts"`。

## 验收命令
```bash
bun run db:migrate                                    # 期望：退出码 0
sqlite3 data/skills.db ".tables" | grep -qw skills_fts               # 期望：匹配
sqlite3 data/skills.db ".tables" | grep -qw agent_skills             # 期望：匹配
sqlite3 data/skills.db ".tables" | grep -qw test_runs                # 期望：匹配
sqlite3 data/skills.db "select count(*) from tools;"                 # 期望：4
sqlite3 data/skills.db "select count(*) from providers;"             # 期望：1
sqlite3 data/skills.db "select count(*) from pragma_table_info('skills') where name='file_hash';"  # 期望：1