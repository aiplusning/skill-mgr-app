# 本地 Skill 管理器 · 开发需求方案 v2（Next.js 全栈 · 2 天 AI Coding）

## 一、MVP 范围（更新）

### 必须交付

| # | 模块 | 一句话定义 |
|---|---|---|
| M1 | 扫描与索引 | 扫描配置根目录，识别含 `SKILL.md` 的目录，解析 frontmatter 入库 |
| M2 | Skill 元数据 | 分类、业务场景、标签、关联项目、支持工具、备注 |
| M3 | Skill 编辑与保存 | 编辑器改内容，支持“写回文件 / 存为 SQLite 变体 / 导出到目录” |
| M4 | **Agent 编排与测试** | 定义 Agent（1..N Skill 组合 + 系统提示 + 模型），跑测试用例，对比 baseline，人工打分 |
| M5 | 分发视图 | 按工具 × 项目矩阵展示 Skill 安装位置，支持 symlink/copy 安装与卸载 |
| M6 | SQLite 变体管理 | 查看/预览/恢复/删除某个 Skill 的历史变体 |

### 明确不做（写进 README）

- ❌ 不做 Git 远程推送（只留字段和禁用按钮）
- ❌ 不做用户登录 / 多租户 / 权限
- ❌ 不做远程市场、不做向量检索
- ❌ 不做脚本沙箱执行
- ❌ 不做自动生成 Skill
- ❌ 不做 Electron / Tauri 打包，`next start` 起本地服务即可

---

## 二、核心概念与数据模型

### 2.1 实体关系（更新）

```
Agent (1) ──< AgentSkill >── (1) Skill        组合关系，有序
Agent (1) ──< TestCase (1) ──< TestRun
Skill (1) ──< SkillVersion                     SQLite 变体
Skill (1) ──< SkillTag >── (1) Tag
Skill (1) ──< SkillProject >── (1) Project
Skill (1) ──< SkillTool >── (1) Tool
```

### 2.2 SQLite Schema（Drizzle 可映射，关键表已定死）

```sql
-- ========== Skill ==========
CREATE TABLE skills (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  frontmatter   TEXT,            -- 原始 YAML 全文
  body          TEXT,            -- --- 之后正文
  dir_path      TEXT NOT NULL UNIQUE,
  source        TEXT DEFAULT 'local',
  category      TEXT,            -- 枚举 7 值
  business_scene TEXT,
  notes         TEXT,
  install_count INTEGER DEFAULT 0,
  file_mtime    INTEGER,
  file_hash     TEXT,
  git_remote    TEXT,            -- 预留
  git_branch    TEXT,            -- 预留
  status        TEXT DEFAULT 'ok', -- 'ok' | 'invalid' | 'missing'
  created_at    INTEGER DEFAULT (unixepoch()),
  updated_at    INTEGER DEFAULT (unixepoch())
);

-- ========== Skill 变体（SQLite 存储） ==========
CREATE TABLE skill_versions (
  id         TEXT PRIMARY KEY,
  skill_id   TEXT REFERENCES skills(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,      -- 完整 SKILL.md 文本（含 frontmatter）
  note       TEXT,               -- 用户填的备注
  created_at INTEGER DEFAULT (unixepoch())
);

-- ========== 标签 / 项目 / 工具（同 v1，略同） ==========
CREATE TABLE tags (...);
CREATE TABLE skill_tags (...);
CREATE TABLE projects (...);
CREATE TABLE skill_projects (...);
CREATE TABLE tools (...);       -- 预置 claude-code / grok / agents / cursor
CREATE TABLE skill_tools (...);

-- ========== Agent（新增，核心） ==========
CREATE TABLE agents (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  system_prompt  TEXT,                    -- 可选的额外系统提示（拼在 Skill 前）
  provider_id    TEXT REFERENCES providers(id),
  created_at     INTEGER DEFAULT (unixepoch()),
  updated_at     INTEGER DEFAULT (unixepoch())
);

CREATE TABLE agent_skills (
  agent_id    TEXT REFERENCES agents(id) ON DELETE CASCADE,
  skill_id    TEXT REFERENCES skills(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,           -- 组合顺序
  PRIMARY KEY (agent_id, skill_id)
);

-- ========== 模型 Provider ==========
CREATE TABLE providers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  base_url   TEXT NOT NULL,
  api_key    TEXT NOT NULL,               -- 本地存储，明确告知用户风险
  model      TEXT NOT NULL,
  enabled    INTEGER DEFAULT 1
);

-- ========== 测试用例与运行（改为挂在 Agent 上） ==========
CREATE TABLE test_cases (
  id         TEXT PRIMARY KEY,
  agent_id   TEXT REFERENCES agents(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  user_input TEXT NOT NULL,
  context    TEXT,                        -- 可选的额外上下文
  expected   TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE test_runs (
  id             TEXT PRIMARY KEY,
  case_id        TEXT REFERENCES test_cases(id) ON DELETE CASCADE,
  provider_id    TEXT,
  model          TEXT NOT NULL,
  with_agent     INTEGER NOT NULL,        -- 1=完整Agent, 0=baseline
  skill_snapshot TEXT NOT NULL,           -- JSON: [{skill_id, name, order}]
  system_prompt  TEXT,                    -- 实际组装的 system prompt（便于复盘）
  output         TEXT,
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  latency_ms     INTEGER,
  score          INTEGER,                 -- 1-5 人工打分
  score_note     TEXT,
  error          TEXT,
  created_at     INTEGER DEFAULT (unixepoch())
);

-- 全文检索
CREATE VIRTUAL TABLE skills_fts USING fts5(
  name, description, body, business_scene,
  content='skills', content_rowid='rowid'
);
```

**关键约束**：

- `agent_skills.order_index` 唯一（同一 Agent 内不能重复），UI 拖拽排序后整体重写。
- `skill_versions.content` 存**完整文本**（含 frontmatter），恢复时按“写回文件”或“覆盖当前草稿”两种方式处理，UI 弹窗让用户选。
- `test_runs.skill_snapshot` 必须存，这是历史运行可复盘的前提。

---

## 三、技术选型（Next.js 全栈）

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js 15 App Router** | 全栈一体，API 用 Route Handlers，无第二个进程 |
| 语言 | TypeScript strict | AI 生成代码质量更稳 |
| 数据库 | **SQLite + Drizzle ORM + better-sqlite3** | Drizzle 类型推导强，migration 显式，本地文件零运维 |
| 样式 | Tailwind + shadcn/ui | 复制即用 |
| 编辑器 | **CodeMirror 6**（`@uiw/react-codemirror`） | 轻、Markdown/YAML 支持好 |
| frontmatter | `gray-matter` | 成熟稳定 |
| 文件监听 | `chokidar`（Node runtime 下） | 可选，MVP 可以先只靠手动扫描 |
| LLM 调用 | `openai` SDK | Grok 端点兼容，一家代码通吃 |
| Git | MVP 不实现（预留字段） | 用户已确认延后 |
| 运行 | `next dev`（开发）/ `next start`（使用），默认端口 4317 | 单进程，避免 portless 类问题 |

**目录结构**：

```
app/
  (dashboard)/
    skills/page.tsx                 # 列表
    skills/[id]/page.tsx            # 详情（含编辑、变体、单 skill 测试）
    agents/page.tsx                 # Agent 列表
    agents/[id]/page.tsx            # Agent 编排 + 测试台
    settings/page.tsx
  api/
    scan/route.ts
    skills/route.ts
    skills/[id]/route.ts
    skills/[id]/file/route.ts
    skills/[id]/versions/route.ts
    skills/[id]/install/route.ts
    agents/route.ts
    agents/[id]/route.ts
    agents/[id]/skills/route.ts
    cases/route.ts
    cases/[id]/run/route.ts
    providers/route.ts
    tools/route.ts
    projects/route.ts
lib/
  db/schema.ts
  db/index.ts
  scanner.ts
  agent-runner.ts
  fs-safe.ts
```

**所有文件系统 / LLM 调用只能在 `app/api/**` 或 `lib/**`（server-only）中执行**，前端 Client Component 不直接 import。

---

## 四、功能规格与验收标准

### M1 扫描与索引（同 v1，略）

验收：3 个根目录放 5 个 Skill（1 个缺 name），扫描后 4 ok + 1 invalid；改一个 description 再扫描，记录更新。

### M2 Skill 元数据（同 v1，略）

验收：设置 category / 2 个项目 / 3 个工具后刷新保持；FTS 搜 body 中的词能命中。

### M3 编辑与三种保存方式（更新）

**行为**：

1. 详情页“编辑”Tab 加载 `SKILL.md` 全文到 CodeMirror。
2. 保存三按钮：
   - **保存到文件**：校验 frontmatter（`name` 必须存在且等于 slug）→ 写入原文件 → 更新 `file_hash/mtime` → 单条重解析。
   - **存为草稿（SQLite）**：把当前编辑器内容 + 用户输入的备注写入 `skill_versions`，**不碰原文件**。保存后提示“已存为变体 #N”。
   - **另存为…**：弹目录选择（前端只能拿到用户输入路径，后端校验合法）→ 在 `<dir>/<slug>/` 下写 `SKILL.md` → 提示“已导出，可点击扫描纳入管理”。
3. “变体”Tab 列出该 Skill 所有 `skill_versions`，支持预览、恢复（弹窗选“写回文件”或“仅替换草稿”）、删除。

**验收**：
- 改正文→“保存到文件”→系统编辑器确认已写入。
- 改正文→“存为草稿”→原文件未变，变体列表多一条，内容正确。
- 草稿点“恢复→写回文件”→原文件变为草稿内容，`file_hash` 变化。
- name 与 slug 不一致时，“保存到文件”被拒绝并提示，其他两种保存允许（草稿/导出不强制 slug 一致）。

### M4 Agent 编排与测试（核心，重写）

**编排（Agent 详情页）**：

1. 基本信息：名称、描述、系统提示词（多行）、默认 Provider。
2. Skill 组合：从 Skill 列表搜索添加，拖拽排序，展示每个 Skill 的 `name + description` 摘要。**至少 1 个 Skill**才能保存。
3. 保存时整体重写 `agent_skills`（先删后按顺序插）。

**测试台（同页面下方 Tab）**：

1. **用例管理**：名称、用户输入、可选上下文、期望描述。
2. **运行**：
   - 请求 `POST /api/cases/:id/run`，body `{ with_agent: boolean, provider_id? }`。
   - 后端组装：`system = agent.system_prompt + "\n\n" + join(skill_bodies, "\n\n---\n\n")`（with_agent=1）；baseline 时 `system = ""`。
   - 调用 OpenAI 兼容端点，`max_tokens=1024`，超时 60s，失败落 `error` 字段。
   - 落库 `test_runs`，含 `skill_snapshot` 和实际 `system_prompt`。
3. **对比视图**：同一用例最近一次 `with_agent` 与 `baseline` 左右分栏；支持切换历史记录。
4. **打分**：1–5 分 + 备注，写回 `test_runs`。
5. **Prompt 预览**：运行前可点“查看将发送的 system prompt”，不消耗 token。

**单 Skill 快速测试（Skill 详情页，轻量）**：内嵌一个迷你表单，输入 → 直接以该 Skill 全文为 system prompt 调一次，结果展示但不入库（或标记 `case_id = NULL` 的临时记录，二选一，建议**不入库**保持简单）。

**验收**：
- 建一个含 3 个 Skill 的 Agent，跑一次 with_agent，在 `test_runs.skill_snapshot` 中能看到 3 个 skill 的顺序。
- 改其中一个 Skill 的正文后，重新跑，历史 run 的 snapshot 和 system_prompt 不变（证明快照有效）。
- 分别跑 with_agent 和 baseline，UI 并排显示，打分能落库。
- 没有 Provider 时点运行，返回明确错误而非白屏。

### M5 分发视图（同 v1，略）

验收：symlink 到 `~/.claude/skills` 后矩阵显示已安装；手动删目标目录后刷新显示“路径失效”。

### M6 SQLite 变体管理（已在 M3 内）

验收见 M3。

---

## 五、API 设计（Next.js Route Handlers）

```
POST   /api/scan
GET    /api/skills?q=&category=&tag=&project=&tool=
GET    /api/skills/:id
PATCH  /api/skills/:id/meta
GET    /api/skills/:id/file
PUT    /api/skills/:id/file            # 保存到文件
GET    /api/skills/:id/versions
POST   /api/skills/:id/versions        # 存为草稿
POST   /api/skills/:id/versions/:vid/restore   # body: { mode: 'file'|'draft' }
DELETE /api/skills/:id/versions/:vid
POST   /api/skills/:id/export          # 另存为，body: { targetDir }
POST   /api/skills/:id/install         # body: { tool_id, mode }
DELETE /api/skills/:id/install/:toolId

GET    /api/agents
POST   /api/agents
GET    /api/agents/:id
PATCH  /api/agents/:id
DELETE /api/agents/:id
PUT    /api/agents/:id/skills          # body: [{ skill_id, order_index }]

GET    /api/agents/:id/cases
POST   /api/agents/:id/cases
PATCH  /api/cases/:id
DELETE /api/cases/:id
POST   /api/cases/:id/run              # body: { with_agent, provider_id? }
GET    /api/cases/:id/runs
PATCH  /api/runs/:id                   # 打分

GET    /api/providers  POST  PATCH  DELETE
GET    /api/tools      POST  PATCH  DELETE
GET    /api/projects   POST  PATCH  DELETE
GET    /api/tags
GET    /api/settings   PUT
```

统一响应 `{ ok, data?, error?: { code, message } }`。

**安全硬约束**（写进需求，AI 生成时必检）：

- 所有写文件的 API 必须在 `fs-safe.ts` 内调用，先 `path.resolve`，校验目标路径前缀属于 `settings.scan_roots` 或用户显式指定的 `targetDir`，且 `targetDir` 必须是绝对路径、不允许 `..`。
- `provider.api_key` 只在后端使用，`GET /api/providers` 返回时打码为 `sk-***last4`。

---

## 六、页面清单

1. `/skills`：列表 + 筛选 + 矩阵视图切换。
2. `/skills/[id]`：Tab = 概览 / 编辑（三保存）/ 变体 / 单 Skill 测试 / 分发。
3. `/agents`：Agent 列表。
4. `/agents/[id]`：Tab = 编排（基本信息 + Skill 组合拖拽）/ 用例 / 运行结果对比。
5. `/settings`：扫描根目录、项目、工具、Provider、远程推送（禁用占位）。
6. `/runs/[id]`：单次运行详情（可并入 agents 详情，不单独成页）。

---

## 七、2 天任务拆解（每张卡单独一个 AI Coding 对话）

### Day 1 上午 · 骨架 + 扫描 + 列表

**T1 Next.js 骨架**（0.5h）
- `create-next-app` + Tailwind + shadcn 初始化，端口 4317，`/api/health` 返回 ok。

**T2 DB 初始化**（1h）
- Drizzle schema（按第三节），migration，`tools` 预置 4 条，`providers` 预置 1 条 Grok 占位。

**T3 扫描器**（1.5h）
- `lib/scanner.ts` + `POST /api/scan`，frontmatter 解析、哈希、upsert、FTS 同步。

**T4 Skill 列表页**（1.5h）
- `/skills` 表格/卡片 + 搜索 + 筛选。

### Day 1 下午 · Skill 详情 + 编辑三保存

**T5 Skill 详情页骨架**（1h）
- 概览 Tab、路由参数、数据加载。

**T6 元数据编辑**（1h）
- 表单 + `PATCH /meta`，项目/工具/标签 CRUD。

**T7 编辑器 + 三种保存**（2h）
- CodeMirror、frontmatter 校验、`PUT /file`、`POST /versions`、`POST /export`、`fs-safe.ts`。

**T8 变体管理**（1h）
- 变体 Tab、预览、restore（双模式）、删除。

### Day 1 晚上 / Day 2 上午 · Agent 编排 + 测试台

**T9 Provider + LLM 封装**（1h）
- `lib/agent-runner.ts`：组装 system prompt、调用 openai SDK、超时、错误归一化。

**T10 Agent CRUD + Skill 组合编排**（2h）
- `/agents`、`/agents/[id]` 基本信息、拖拽排序（`@dnd-kit/core`）、`PUT /agents/:id/skills`。

**T11 用例 + 运行 + 对比**（2h）
- 用例 CRUD、`POST /run`（含 snapshot 落库）、并排对比、Prompt 预览。

**T12 打分 + 历史**（1h）
- `PATCH /runs/:id`，历史列表。

### Day 2 下午 · 分发 + 收尾

**T13 分发视图**（1.5h）
- install/uninstall + 矩阵 + 失效检测。

**T14 单 Skill 快速测试**（0.5h）
- Skill 详情页迷你表单，复用 agent-runner，不入库。

**T15 收尾**（1.5h）
- 全局错误/空状态、README、`seed/` 3 个示例 Skill、冒烟测试。

**缓冲**：剩 1–1.5h 处理返工。若落后，砍 T13 的矩阵视图（保留单 Skill install/uninstall），砍 T12 历史列表。

---

## 八、AI Coding 操作建议（针对本方案的新变化）

1. **Agent 编排是最容易翻车的模块**：让 AI 先输出 `agent_skills` 的读写事务代码（先删后插，包在一个事务里），review 通过再做 UI。拖拽排序永远只在前端维护数组，保存时整体覆盖，不做增量 diff。
2. **快照逻辑单独 TDD**：`agent-runner` 的 `assembleSystemPrompt(agent, skills)` 和 `buildSnapshot(agent, skills)` 两个纯函数先写单元测试，再接入 API。这是历史可复盘的根基。
3. **三种保存方式共享一个“编辑器脏状态”判定**：AI 常会写出三份重复的保存逻辑。要求它抽 `saveSkill(content, mode, options)` 一个函数，mode ∈ `{file|draft|export}`。
4. **fs-safe 必须人工 review**：`POST /export` 接受用户路径，是路径穿越的高危点。要求 AI 输出前先 `path.resolve` + 前缀白名单校验，写单测覆盖 `../`、绝对路径越权、symlink 指向外部三种情况。
5. **Provider api_key 打码**：在 `GET /api/providers` 的序列化层统一打码，不要让 AI 在每个 handler 里各自处理。
6. **禁止 AI 扩表**：Schema 已定死。若 AI 想加字段，先停。
7. **Next.js Server/Client 边界**：所有 DB、fs、LLM 调用必须在 Route Handler 或 `server-only` 模块；Client Component 只 fetch `/api/*`。AI 容易在页面里直接 import db，review 时重点查 `'use client'` 文件的 import。

---

## 九、风险与预案

| 风险 | 概率 | 预案 |
|---|---|---|
| Agent 组合测试的真实 token 消耗大 | 高 | 默认 `max_tokens=1024`，加“Prompt 预览”按钮，不加自动回归 |
| 用户路径导致的越权写入 | 中 | fs-safe 统一校验 + 单测覆盖 |
| 拖拽排序保存后顺序错乱 | 中 | 保存时前端重建 `[0..n-1]` 完整数组，后端事务内删+插 |
| 变体恢复时覆盖原文件不可逆 | 中 | restore 前自动把当前文件内容存一条新变体（备份） |
| Git 预留字段被 AI 误实现 | 低 | 需求文档明确写“v2”，且设置页只放禁用按钮 |
| 2 天做不完 M5 | 中 | 按第八节砍矩阵视图 |
| Next.js App Router 缓存导致列表不刷新 | 中 | 所有 API 路由 `export const dynamic = 'force-dynamic'`，列表页 `router.refresh()` |

---

## 十、交付物清单

- `README.md`：启动方式（`bun install && bun dev`，端口 4317）、默认扫描路径、Provider 配置说明、三种保存方式说明、v2 预留项说明。
- `data/skills.db`（运行时生成，migration 自动建表）。
- `seed/`：3 个示例 Skill + 1 个示例 Agent（含 2 个 Skill 组合 + 2 个用例）。
- 可运行的 `next dev` 本地服务。

---

**与 v1 的关键差异总结**：测试对象从 Skill 升级为 Agent（组合 + 顺序 + 快照），Skill 保存从单一路径扩为“文件 / SQLite 变体 / 导出”三选一，技术栈统一到 Next.js 全栈单进程，Git 推送整体延后。任务总量与 v1 基本持平（因为砍掉 Git 换了 Agent 编排），2 天 AI Coding 依然可行。