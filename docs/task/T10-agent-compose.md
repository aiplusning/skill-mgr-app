
---

### 文件：`docs/tasks/T10-agent-compose.md`

```markdown
# T10 · Agent CRUD + 组合编排

## 依赖
- T09

## 先读
- docs/REQUIREMENTS.md §四 M4（编排）
- docs/REQUIREMENTS.md §八 第 1 条

## 产出（文件清单）
- app/(dashboard)/agents/page.tsx
- app/(dashboard)/agents/[id]/page.tsx
- app/(dashboard)/agents/[id]/_compose.tsx
- app/api/agents/route.ts
- app/api/agents/[id]/route.ts
- app/api/agents/[id]/skills/route.ts

## 步骤
1. 安装：`bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`。
2. `app/api/agents/route.ts`：GET 列表（含 skill 数量）、POST 创建（name/description/system_prompt/provider_id）。
3. `app/api/agents/[id]/route.ts`：GET 详情（含 skills 有序列表）、PATCH 基本信息、DELETE。
4. `app/api/agents/[id]/skills/route.ts`：`PUT`，body `[{ skill_id, order_index }]`。
   - **在一个事务内**：`DELETE FROM agent_skills WHERE agent_id=?`，再按数组顺序 `INSERT`。
   - 校验 `order_index` 恰好为 `0..n-1` 无重复无缺口，否则 400。
   - 校验至少 1 条，否则 400 `AT_LEAST_ONE_SKILL`。
5. `app/(dashboard)/agents/page.tsx`：列表 + 新建按钮（Dialog）。
6. `app/(dashboard)/agents/[id]/page.tsx`：上方基本信息表单（可 PATCH），下方 `_compose.tsx` 组合区。
7. `_compose.tsx`：
   - 左侧 Skill 搜索框（调 `/api/skills?q=`），点击添加。
   - 右侧拖拽列表（dnd-kit sortable），每行显示 name + description 摘要 + 删除按钮。
   - 保存按钮：前端重建 `[{skill_id, order_index:0..n-1}]` 整体 `PUT`。

## 验收命令
```bash
bun dev &  sleep 5
AID=$(curl -s -X POST localhost:4317/api/agents -H 'content-type: application/json' \
  -d '{"name":"demo-agent","description":"test"}' | jq -r '.data.id')
S1=$(sqlite3 data/skills.db "select id from skills where status='ok' limit 1 offset 0;")
S2=$(sqlite3 data/skills.db "select id from skills where status='ok' limit 1 offset 1;")
S3=$(sqlite3 data/skills.db "select id from skills where status='ok' limit 1 offset 2;")
curl -s -X PUT "localhost:4317/api/agents/$AID/skills" -H 'content-type: application/json' \
  -d "[{\"skill_id\":\"$S1\",\"order_index\":0},{\"skill_id\":\"$S2\",\"order_index\":1},{\"skill_id\":\"$S3\",\"order_index\":2}]" | jq -e '.ok'
sqlite3 data/skills.db "select count(*) from agent_skills where agent_id='$AID';"     # 期望：3
# 换序
curl -s -X PUT "localhost:4317/api/agents/$AID/skills" -H 'content-type: application/json' \
  -d "[{\"skill_id\":\"$S3\",\"order_index\":0},{\"skill_id\":\"$S2\",\"order_index\":1},{\"skill_id\":\"$S1\",\"order_index\":2}]" > /dev/null
FIRST=$(sqlite3 data/skills.db "select skill_id from agent_skills where agent_id='$AID' and order_index=0;")
test "$FIRST" = "$S3"                                                                  # 期望：退出码 0
# 空数组拒绝
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "localhost:4317/api/agents/$AID/skills" \
  -H 'content-type: application/json' -d '[]')
test "$CODE" = "400"                                                                   # 期望：退出码 0
kill %1