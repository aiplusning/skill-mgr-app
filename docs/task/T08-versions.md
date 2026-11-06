
---

### 文件：`docs/tasks/T08-versions.md`

```markdown
# T08 · 变体管理

## 依赖
- T07

## 先读
- docs/REQUIREMENTS.md §四 M3 第 3 点
- docs/REQUIREMENTS.md §九（变体恢复时覆盖原文件不可逆）

## 产出（文件清单）
- app/(dashboard)/skills/[id]/_versions.tsx
- app/api/skills/[id]/versions/[vid]/route.ts
- app/api/skills/[id]/versions/[vid]/restore/route.ts

## 步骤
1. `app/api/skills/[id]/versions/[vid]/route.ts`：`DELETE` 删除单条变体。
2. `app/api/skills/[id]/versions/[vid]/restore/route.ts`：`POST`，body `{ mode: 'file' | 'draft' }`。
   - **恢复前自动备份**：读取当前 `SKILL.md` 全文，`INSERT skill_versions(skill_id, content, note='auto backup before restore @ <ts>')`。
   - `mode='file'`：把变体内容写回原文件（复用 `saveSkill({mode:'file'})`，如果 name 与 slug 不一致则拒绝并返回 `NAME_MISMATCH`）。
   - `mode='draft'`：把变体内容作为新草稿再插一条（避免原地修改历史）。
   - 返回 `{ ok, backup_version_id }`。
3. `_versions.tsx`：列表（时间倒序，显示 note + 创建时间 + 内容摘要前 80 字），每条操作：预览（Dialog 显示全文）、恢复（弹 Dialog 选 file/draft）、删除（二次确认）。

## 验收命令
```bash
bun dev &  sleep 5
ID=$(sqlite3 data/skills.db "select id from skills where slug='demo-alpha' limit 1;")
# 准备两条草稿
curl -s -X POST "localhost:4317/api/skills/$ID/versions" -H 'content-type: application/json' \
  -d '{"content":"---\nname: demo-alpha\ndescription: v1\n---\nBODY_V1"}' > /dev/null
curl -s -X POST "localhost:4317/api/skills/$ID/versions" -H 'content-type: application/json' \
  -d '{"content":"---\nname: demo-alpha\ndescription: v2\n---\nBODY_V2"}' > /dev/null
VID=$(sqlite3 data/skills.db "select id from skill_versions where skill_id='$ID' and note is null order by created_at asc limit 1;")
BEFORE=$(sqlite3 data/skills.db "select count(*) from skill_versions where skill_id='$ID';")
curl -s -X POST "localhost:4317/api/skills/$ID/versions/$VID/restore" -H 'content-type: application/json' \
  -d '{"mode":"file"}' | jq -e '.ok'                                       # 期望：true
AFTER=$(sqlite3 data/skills.db "select count(*) from skill_versions where skill_id='$ID';")
test "$AFTER" -eq $((BEFORE+1))                                            # 期望：新增一条备份
grep -q 'BODY_V1' "$(sqlite3 data/skills.db "select dir_path from skills where id='$ID';")/SKILL.md"  # 期望：匹配
kill %1