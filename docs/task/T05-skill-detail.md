
---

### 文件：`docs/tasks/T05-skill-detail.md`

```markdown
# T05 · Skill 详情页骨架

## 依赖
- T04

## 先读
- docs/REQUIREMENTS.md §六（页面清单）

## 产出（文件清单）
- app/(dashboard)/skills/[id]/page.tsx
- app/(dashboard)/skills/[id]/_tabs.tsx
- app/api/skills/[id]/route.ts
- lib/api-helpers.ts

## 步骤
1. `lib/api-helpers.ts`：`ok(data)`、`fail(code, message, status?)` 两个辅助函数，统一 `{ ok, data?, error? }` 格式。
2. `app/api/skills/[id]/route.ts`：`GET` 返回单条 Skill 全部字段 + 关联的 tags/projects/tools（LEFT JOIN 聚合）。
3. `app/(dashboard)/skills/[id]/page.tsx`：Server Component 加载数据，渲染 Tab 容器。
4. `_tabs.tsx`：5 个 Tab——概览 / 编辑 / 变体 / 单 Skill 测试 / 分发。除“概览”外其余 Tab 先渲染 `<div className="text-muted-foreground">Coming soon</div>` 占位。
5. 概览 Tab 显示：name、slug、description、dir_path、status、frontmatter 原文（折叠展开）、元数据区（category/tags/projects/tools/notes，本卡只读展示）。

## 验收命令
```bash
bun dev &  sleep 5
ID=$(sqlite3 data/skills.db "select id from skills limit 1;")
curl -s "localhost:4317/api/skills/$ID" | jq -e ".data.name != null"      # 期望：true
curl -s "localhost:4317/skills/$ID" | grep -qi '概览\|Overview'           # 期望：匹配
kill %1