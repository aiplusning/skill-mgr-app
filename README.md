# Skill Manager

本地 AI Skill 管理器：扫描 `SKILL.md`，维护 Skill 元数据与历史变体，组合 Agent 并运行测试，还可将 Skill 安装到本地工具目录。

## 启动

需要 Bun 与支持 SQLite FTS5 的 SQLite。首次启动：

```bash
bun install
bun run db:migrate
bun run seed
bun dev
```

开发服务默认监听 `http://localhost:4317`。生产方式：`bun run build && bun run start`。

数据库默认位于 `./data/skills.db`，可用 `DB_PATH` 指定其他位置。数据库文件和 `.env.local` 不应提交到版本控制。

## 扫描 Skill

打开 Skills 页面点击“扫描目录”，或调用：

```bash
curl -X POST http://localhost:4317/api/scan -H 'content-type: application/json' -d '{}'
```

默认扫描根目录：

- `~/.claude/skills`
- `~/.grok/skills`
- `~/.agents/skills`
- `<项目目录>/seed/skills`

每个 Skill 目录需包含 `SKILL.md`，frontmatter 至少应提供 `name` 和 `description`。扫描器会把不完整的文件标记为 invalid，而不会删除数据库中的旧记录。

## Provider 设置

在 Settings / Providers 中（Provider API 当前可用）配置 OpenAI 兼容服务：名称、Base URL、模型、API Key 和启用状态。也可以通过 API 管理：

- `GET /api/providers`：列出 Provider，API Key 已脱敏。
- `POST /api/providers`：创建，body 示例 `{ "name": "Grok", "base_url": "https://api.x.ai/v1", "model": "grok-4", "api_key": "...", "enabled": true }`。
- `PATCH /api/providers/:id`：更新字段。
- `DELETE /api/providers/:id`：删除 Provider。

API Key 会保存在本机 SQLite 数据库中，请仅在可信本地环境使用。未配置或没有启用的 Provider 时，运行测试会返回明确的 `NO_PROVIDER` 错误。

## Skill 的保存方式

| 方式 | 保存位置 | 用途 |
| --- | --- | --- |
| 保存到文件 | 原 Skill 目录的 `SKILL.md` | 校验 frontmatter 的 `name` 与 slug 一致后写回原文件 |
| 存为 SQLite 变体 | 本地 SQLite `skill_versions` 表 | 保存完整草稿与备注，不改原文件 |
| 另存为 | 用户指定的现有目标目录下 `<slug>/SKILL.md` | 导出副本；后端会验证路径与 slug |

恢复变体时可写回文件或另存为新草稿；写回前会先自动备份当前文件。

## Agent 测试

在 Agents 页面新建 Agent，设置系统提示、Provider 与有序 Skill 组合，然后创建用例。测试台支持运行 with_agent / baseline、预览 System Prompt、查看历史记录与人工评分。运行会请求所选 Provider 并产生 token 消耗。

单 Skill 快速测试也会调用模型并消耗 token，但不会写入 `test_runs`。

## 分发

Skill 详情页的“分发”Tab 支持 symlink 或 copy 到启用工具的全局 Skill 路径；Skills 页面可切换矩阵查看安装状态。只有数据库记录管理的安装路径可由卸载操作移除。若已安装目录路径失效，页面会显示“路径失效”。

## 开发检查

```bash
bun run status
bun run smoke
bun test lib/agent-runner.test.ts
bun run build
```

`scripts/smoke.sh` 会创建并清理临时 Skill/Agent 测试数据，并临时将 `agents` 工具安装目录设为隔离的临时目录。请确保开发服务器已运行、`sqlite3` 命令可用，且未在 smoke 运行期间并行修改 `agents` 工具路径。

## 范围说明（v2）

**未实现**：Git 远程推送 / 同步、用户登录与用户系统、多租户权限、远程 Skill 市场、向量检索、脚本沙箱执行、自动生成 Skill、Electron/Tauri 桌面打包。应用按本地单用户服务设计。
