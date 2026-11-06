
---

### 文件：`docs/tasks/T07-editor-save.md`

```markdown
# T07 · 编辑器 + 三种保存

## 依赖
- T05

## 先读
- docs/REQUIREMENTS.md §四 M3
- docs/REQUIREMENTS.md §五（安全硬约束）
- docs/REQUIREMENTS.md §八 第 3、4 条

## 产出（文件清单）
- app/(dashboard)/skills/[id]/_editor.tsx
- app/api/skills/[id]/file/route.ts
- app/api/skills/[id]/versions/route.ts
- app/api/skills/[id]/export/route.ts
- lib/save-skill.ts
- lib/fs-safe.ts（补全 writeUnderRoot / exportUnderDir）
- lib/frontmatter.ts

## 步骤
1. 安装：`bun add @uiw/react-codemirror @codemirror/lang-markdown @codemirror/lang-yaml gray-matter`。
2. `lib/frontmatter.ts`：`parse(text): { data, content, error? }` 包一层 gray-matter；`validateNameMatchesSlug(data, slug)` 返回 `{ ok, reason? }`。
3. `lib/fs-safe.ts` 补：
   - `writeUnderRoots(absPath, content, roots)`：`path.resolve` + `isUnderRoot` 校验后 `writeFileSync`。
   - `writeUnderDir(targetDir, slug, content)`：校验 `targetDir` 是绝对路径、不含 `..`、存在且为目录，然后写 `<targetDir>/<slug>/SKILL.md`。
4. `lib/save-skill.ts`：**单一入口** `saveSkill({ skill, content, mode, options })`：
   - `mode='file'`：`validateNameMatchesSlug` 通过 → `writeUnderRoots(skill.dir_path/SKILL.md)` → 重算 `file_hash` 与 `mtime` → 更新 `skills` → 返回 `{ mode, updated_at }`。
   - `mode='draft'`：`INSERT skill_versions(skill_id, content, note)` → 返回 `{ mode, version_id }`。
   - `mode='export'`：`writeUnderDir(options.targetDir, skill.slug, content)` → 返回 `{ mode, path }`。
   - **不允许三份重复逻辑**，三种模式必须走同一函数分派。
5. `app/api/skills/[id]/file/route.ts`：`GET` 返回全文；`PUT` 接 `{ content }`，调 `saveSkill(mode='file')`，失败返回 `{ ok:false, error }`，`NAME_MISMATCH` 用 422 状态码。
6. `app/api/skills/[id]/versions/route.ts`：`GET` 列表（倒序）；`POST` 接 `{ content, note }`，调 `saveSkill(mode='draft')`。
7. `app/api/skills/[id]/export/route.ts`：`POST` 接 `{ content, targetDir }`，调 `saveSkill(mode='export')`。
8. `_editor.tsx`：CodeMirror 加载全文（markdown + yaml 语法）→ 顶部三按钮：保存到文件 / 存为草稿（弹 Dialog 输 note）/ 另存为（弹 Dialog 输 targetDir）→ 底部“预览”切换只读渲染。
9. 编辑器顶部保留“未保存”标记；离开路由时若有未保存变更用 `confirm`。

## 验收命令
```bash
bun dev &  sleep 5
ID=$(sqlite3 data/skills.db "select id from skills where slug='demo-alpha' limit 1;")
FILE=$(sqlite3 data/skills.db "select dir_path from skills where id='$ID';")/SKILL.md
M1=$(md5sum "$FILE" | cut -d' ' -f1)
# 1) 保存到文件
curl -s -X PUT "localhost:4317/api/skills/$ID/file" -H 'content-type: application/json' \
  -d '{"content":"---\nname: demo-alpha\ndescription: 改过了\n---\n正文变更\n"}' | jq -e '.ok'
M2=$(md5sum "$FILE" | cut -d' ' -f1); test "$M1" != "$M2"           # 期望：退出码 0
# 2) 存为草稿
V1=$(sqlite3 data/skills.db "select count(*) from skill_versions where skill_id='$ID';")
curl -s -X POST "localhost:4317/api/skills/$ID/versions" -H 'content-type: application/json' \
  -d '{"content":"---\nname: demo-alpha\ndescription: 草稿\n---\n草稿正文\n","note":"try"}' | jq -e '.ok'
V2=$(sqlite3 data/skills.db "select count(*) from skill_versions where skill_id='$ID';")
test "$V2" -eq $((V1+1))                                            # 期望：退出码 0
M3=$(md5sum "$FILE" | cut -d' ' -f1); test "$M2" == "$M3"           # 期望：原文件未变
# 3) name 与 slug 不一致
curl -s -o /dev/null -w '%{http_code}' -X PUT "localhost:4317/api/skills/$ID/file" \
  -H 'content-type: application/json' \
  -d '{"content":"---\nname: WRONG\ndescription: x\n---\nbody"}' | grep -q '422'   # 期望：匹配
# 4) 导出
mkdir -p /tmp/skill-export
curl -s -X POST "localhost:4317/api/skills/$ID/export" -H 'content-type: application/json' \
  -d '{"content":"---\nname: demo-alpha\ndescription: exp\n---\nbody","targetDir":"/tmp/skill-export"}' | jq -e '.ok'
test -f /tmp/skill-export/demo-alpha/SKILL.md                                       # 期望：存在
# 5) 路径越权
curl -s -o /dev/null -w '%{http_code}' -X POST "localhost:4317/api/skills/$ID/export" \
  -H 'content-type: application/json' -d '{"content":"x","targetDir":"../etc"}' | grep -q '4[0-9][0-9]'  # 期望：匹配
kill %1