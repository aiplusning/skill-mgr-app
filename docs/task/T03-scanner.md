
---

### 文件：`docs/tasks/T03-scanner.md`

```markdown
# T03 · 扫描器

## 依赖
- T02

## 先读
- docs/REQUIREMENTS.md §四 M1
- docs/REQUIREMENTS.md §五（安全硬约束）

## 产出（文件清单）
- lib/scanner.ts
- lib/fs-safe.ts（本卡只需 isUnderRoot / resolveUnderRoots）
- lib/types.ts
- app/api/scan/route.ts
- seed/skills/demo-alpha/SKILL.md
- seed/skills/demo-beta/SKILL.md
- seed/skills/demo-gamma/SKILL.md
- seed/skills/demo-delta/SKILL.md
- seed/skills/demo-broken/SKILL.md

## 步骤
1. `lib/types.ts` 定义 `ParsedSkill`、`ScanResult`、`ScanError` 类型。
2. `lib/fs-safe.ts` 实现：
   - `resolveUnderRoots(target: string, roots: string[]): string`：`path.resolve` 后校验前缀属于任一 root，否则抛 `{code:'PATH_OUT_OF_ROOTS'}`。
   - `isUnderRoot(target, root): boolean`。
3. `lib/scanner.ts` 实现 `scanSkills(roots: string[]): ScanResult`：
   - 递归遍历，跳过 `.git`、`node_modules`、`.next`、`data`、`.venv`。
   - **只把含 `SKILL.md` 的目录识别为 Skill**，不继续向内递归。
   - 用 `gray-matter` 解析；`name` 或 `description` 缺失 → 标记 `invalid` 并在 `ScanResult.invalid` 中返回原因。
   - 计算 `file_hash = sha256(全文)`；与库中同 `dir_path` 记录比较，未变则跳过写库。
   - upsert `skills`；`missing` 的旧记录（库中有但本次扫描未见）只更新 `status='missing'`，不物理删除。
   - 扫描结束后对新增/变更记录同步 `skills_fts`（可复用触发器，也可显式 rebuild）。
   - `slug` 取目录名；`name` 取 frontmatter.name。
4. `app/api/scan/route.ts`：`POST`，body `{ roots?: string[] }`，缺省用 `~/.claude/skills`、`~/.grok/skills`、`~/.agents/skills` 加项目根下 `seed/skills`。返回 `{ ok:true, data:{ ok, invalid, missing, total } }`。
5. 在 `seed/skills/` 造 5 个测试 Skill：4 个合法（名称 alpha~delta），1 个 `demo-broken` 缺 `name` 字段。

## 验收命令
```bash
curl -s -X POST localhost:4317/api/scan -H 'content-type: application/json' -d '{}' \
  | jq -e '.data.ok == 4 and .data.invalid == 1'          # 期望：true
sqlite3 data/skills.db "select count(*) from skills where status='ok';"   # 期望：≥4
sqlite3 data/skills.db "select status from skills where slug='demo-broken';"  # 期望：invalid
BEFORE=$(sqlite3 data/skills.db "select updated_at from skills where slug='demo-alpha';")
sed -i 's/描述/描述已更新/' seed/skills/demo-alpha/SKILL.md
curl -s -X POST localhost:4317/api/scan -H 'content-type: application/json' -d '{}' > /dev/null
AFTER=$(sqlite3 data/skills.db "select updated_at from skills where slug='demo-alpha';")
test "$BEFORE" != "$AFTER"                                # 期望：退出码 0