
---

### 文件：`docs/tasks/T11-cases-run.md`

```markdown
# T11 · 用例 + 运行 + 对比

## 依赖
- T10

## 先读
- docs/REQUIREMENTS.md §四 M4（测试台）
- docs/REQUIREMENTS.md §八 第 2 条

## 产出（文件清单）
- app/(dashboard)/agents/[id]/_cases.tsx
- app/(dashboard)/agents/[id]/_run-compare.tsx
- app/api/agents/[id]/cases/route.ts
- app/api/cases/[id]/route.ts
- app/api/cases/[id]/run/route.ts
- app/api/cases/[id]/runs/route.ts
- app/api/cases/[id]/preview/route.ts

## 步骤
1. `app/api/agents/[id]/cases/route.ts`：GET 列表、POST 创建（name/user_input/context/expected）。
2. `app/api/cases/[id]/route.ts`：PATCH、DELETE。
3. `app/api/cases/[id]/run/route.ts`：`POST`，body `{ with_agent: boolean, provider_id?: string }`。
   - 读 agent + 其有序 skills。
   - `systemPrompt = with_agent ? assembleSystemPrompt(agent, skills) : ''`
   - 取 provider（body 传入优先，否则 agent.provider_id，否则第一个 enabled 的）。
   - 调 `runCompletion`，落 `test_runs`，**必须存 `skill_snapshot` 和实际 `system_prompt`**。
   - 返回 `{ ok, data: run }`。
4. `app/api/cases/[id]/preview/route.ts`：`POST`，body `{ with_agent }`，**只组装不调 API**，返回 `{ system_prompt }`。
5. `app/api/cases/[id]/runs/route.ts`：GET 倒序列表。
6. `_cases.tsx`：用例列表 + 新建表单 + 每条用例下方两个按钮：“运行 with_agent”“运行 baseline”、一个“预览 Prompt”按钮。运行后展示输出。
7. `_run-compare.tsx`：并排两栏——左 = 最近一次 `with_agent`，右 = 最近一次 `baseline`。每栏显示 output + tokens + latency。下方可切换历史记录。

## 验收命令
```bash
bun dev &  sleep 5
AID=$(sqlite3 data/skills.db "select id from agents limit 1;")
CID=$(curl -s -X POST "localhost:4317/api/agents/$AID/cases" -H 'content-type: application/json' \
  -d '{"name":"case1","user_input":"写一个 hello world"}' | jq -r '.data.id')
# 预览
curl -s -X POST "localhost:4317/api/cases/$CID/preview" -H 'content-type: application/json' \
  -d '{"with_agent":true}' | jq -e '.data.system_prompt | length > 0'                 # 期望：true
# 无 provider 时明确报错
sqlite3 data/skills.db "update providers set enabled=0;"
curl -s -X POST "localhost:4317/api/cases/$CID/run" -H 'content-type: application/json' \
  -d '{"with_agent":true}' | jq -e '.error.code == "NO_PROVIDER"'                     # 期望：true
kill %1