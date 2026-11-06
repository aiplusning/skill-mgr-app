
---

### 文件：`docs/tasks/T14-quick-test.md`

```markdown
# T14 · 单 Skill 快速测试

## 依赖
- T09

## 先读
- docs/REQUIREMENTS.md §四 M4 末尾（单 Skill 快速测试）

## 产出（文件清单）
- app/(dashboard)/skills/[id]/_quick-test.tsx
- app/api/skills/[id]/quick-run/route.ts

## 步骤
1. `app/api/skills/[id]/quick-run/route.ts`：`POST`，body `{ user_input, provider_id? }`。
   - 以该 skill 的 body 全文为 system prompt（不加 agent.system_prompt）。
   - 取 provider（body 传入或第一个 enabled）。
   - 调 `runCompletion`，返回 `{ output, latency_ms }`。
   - **不写 `test_runs`**（无 case_id 可挂）。
2. `_quick-test.tsx`：一个输入框 + 运行按钮 + 输出区。运行前提醒“该次调用会消耗 token”。

## 验收命令
```bash
bun dev &  sleep 5
ID=$(sqlite3 data/skills.db "select id from skills where status='ok' limit 1;")
N1=$(sqlite3 data/skills.db "select count(*) from test_runs;")
sqlite3 data/skills.db "update providers set enabled=0;"
curl -s -X POST "localhost:4317/api/skills/$ID/quick-run" -H 'content-type: application/json' \
  -d '{"user_input":"hi"}' | jq -e '.error.code == "NO_PROVIDER"'         # 期望：true
N2=$(sqlite3 data/skills.db "select count(*) from test_runs;")
test "$N1" = "$N2"                                                         # 期望：退出码 0
kill %1