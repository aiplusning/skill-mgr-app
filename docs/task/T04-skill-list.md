
---

### 文件：`docs/tasks/T04-skill-list.md`

```markdown
# T04 · Skill 列表页

## 依赖
- T03

## 先读
- docs/REQUIREMENTS.md §四 M2
- docs/REQUIREMENTS.md §六（页面清单）

## 产出（文件清单）
- app/(dashboard)/layout.tsx
- app/(dashboard)/skills/page.tsx
- app/(dashboard)/skills/_list-client.tsx
- app/api/skills/route.ts

## 步骤
1. `app/(dashboard)/layout.tsx`：左侧导航（Skills / Agents / Settings），右侧内容区，用 shadcn 样式。
2. `app/api/skills/route.ts`：`GET`，支持 `q`、`category`、`tag`、`project`、`tool` 查询参数。
   - `q` 走 `skills_fts MATCH ?`，命中返回 `name/description/body/business_scene` 任一匹配。
   - 其余筛选参数走关联表 `IN` 查询。
   - 返回 `{ ok:true, data: Skill[] }`，每条含 `id/slug/name/description/status/category/updated_at`。
3. `app/(dashboard)/skills/page.tsx`：Server Component 首屏拉数据（或直接 fetch 本机 API），传给 `_list-client.tsx`。
4. `_list-client.tsx`：搜索框（防抖 300ms 调 `/api/skills?q=`）、category 下拉、卡片布局；`status !== 'ok'` 的卡片右上角红色 badge；点击卡片跳 `/skills/[id]`。
5. 空状态：无数据时显示“还没有 Skill，点击右上角扫描”并附一个调用 `POST /api/scan` 的按钮。

## 验收命令
```bash
bun dev &  sleep 5
curl -s 'localhost:4317/api/skills?q=描述' | jq -e '.data | length >= 1'   # 期望：true
curl -s 'localhost:4317/api/skills?category=编码' | jq -e '.ok == true'    # 期望：true
curl -s localhost:4317/skills | grep -qi 'demo-alpha'                     # 期望：匹配
curl -s localhost:4317/skills | grep -qi 'invalid\|无效\|broken'          # 期望：匹配（invalid 标记可见）
kill %1