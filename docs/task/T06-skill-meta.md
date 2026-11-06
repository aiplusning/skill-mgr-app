
---

### 文件：`docs/tasks/T06-skill-meta.md`

```markdown
# T06 · 元数据编辑

## 依赖
- T05

## 先读
- docs/REQUIREMENTS.md §四 M2
- docs/REQUIREMENTS.md §2.2（tags/projects/tools 相关表）

## 产出（文件清单）
- app/(dashboard)/skills/[id]/_meta-form.tsx
- app/api/skills/[id]/meta/route.ts
- app/api/tools/route.ts
- app/api/projects/route.ts
- app/api/tags/route.ts
- app/(dashboard)/settings/page.tsx
- app/(dashboard)/settings/_tools.tsx
- app/(dashboard)/settings/_projects.tsx
- app/(dashboard)/settings/_tags.tsx

## 步骤
1. `app/api/skills/[id]/meta/route.ts`：`PATCH`，body `{ category?, business_scene?, notes?, tag_ids?: string[], project_ids?: string[], tool_ids?: string[] }`。
   - 在一个事务内：更新 `skills` 字段；若传了 `tag_ids/project_ids/tool_ids`，先 `DELETE` 对应关联表中该 skill 的记录，再批量 `INSERT`。
   - 返回更新后的完整 skill。
2. `app/api/tools|projects|tags/route.ts`：各自 GET（列表）/ POST（创建）。tools 额外支持 PATCH 启停。
3. `_meta-form.tsx`：表单控件——category 下拉（7 个枚举值：需求分析/系统架构/编码/测试/产品/运维/其他）、business_scene 文本域、notes 文本域、三个多选（tag/project/tool，数据来自对应 GET）。保存调 `PATCH /meta`，成功后 `router.refresh()`。
4. 设置页三个区块：Tools（名称/全局路径/项目路径/启停）、Projects（名称/根路径）、Tags（kind 下拉 + 名称）。各带新增行 + 列表。
5. 详情页“概览”Tab 的元数据区改为可编辑（点“编辑元数据”按钮弹出 Dialog 或切到内联表单）。

## 验收命令
```bash
bun dev &  sleep 5
ID=$(sqlite3 data/skills.db "select id from skills where status='ok' limit 1;")
curl -s -X PATCH "localhost:4317/api/skills/$ID/meta" -H 'content-type: application/json' \
  -d '{"category":"编码","tool_ids":["claude-code","grok","cursor"]}' | jq -e '.ok'    # 期望：true
sqlite3 data/skills.db "select count(*) from skill_tools where skill_id='$ID';"          # 期望：3
sqlite3 data/skills.db "select category from skills where id='$ID';"                     # 期望：编码
# 幂等：再 PATCH 一次 tool_ids 为 2 个
curl -s -X PATCH "localhost:4317/api/skills/$ID/meta" -H 'content-type: application/json' \
  -d '{"tool_ids":["claude-code","grok"]}' > /dev/null
sqlite3 data/skills.db "select count(*) from skill_tools where skill_id='$ID';"          # 期望：2
kill %1