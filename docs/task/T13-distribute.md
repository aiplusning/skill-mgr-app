
---

### 文件：`docs/tasks/T13-distribute.md`

```markdown
# T13 · 分发视图

## 依赖
- T06、T07

## 先读
- docs/REQUIREMENTS.md §四 M5
- docs/REQUIREMENTS.md §五（安全硬约束）

## 产出（文件清单）
- app/(dashboard)/skills/[id]/_distribute.tsx
- app/(dashboard)/skills/_matrix.tsx
- app/api/skills/[id]/install/route.ts
- app/api/skills/[id]/install/[toolId]/route.ts
- lib/installer.ts

## 步骤
1. `lib/installer.ts`：
   - `install(skill, tool, mode)`：目标路径 `<expandedSkillPath>/<slug>`（`~` 展开为 `os.homedir()`）。mode='symlink' 用 `fs.symlinkSync`；mode='copy' 用 `fs.cpSync` 递归。目标已存在则先拒绝（`TARGET_EXISTS`）。写一条 `skill_tools(skill_id, tool_id, installed_path, install_mode)`。
   - `uninstall(skill, tool)`：读 `skill_tools.install_mode`，`symlink` 用 `fs.unlinkSync`，`copy` 用 `fs.rmSync(recursive)`。**只删 `skill_tools` 表中有记录的路径**，无记录返回 `NOT_MANAGED`。
   - `status(skill, tool)`：`fs.existsSync(installed_path)` 三态：`installed` / `missing` / `not_installed`。
2. `app/api/skills/[id]/install/route.ts`：`POST`，body `{ tool_id, mode }`，调 `install`。
3. `app/api/skills/[id]/install/[toolId]/route.ts`：`DELETE`，调 `uninstall`。
4. `_distribute.tsx`：列出所有 enabled 的 tool，每行显示当前状态（已装/未装/路径失效）+ 安装按钮（mode 下拉）+ 卸载按钮（未装时禁用）。
5. `_matrix.tsx`：行 = Skill，列 = Tool，单元格三态色块；每格点击可展开路径详情。列表页顶部加“列表/矩阵”切换。
6. 路径展开统一用 `expandHome(p)` 辅助（`~` → `os.homedir()`）。

## 验收命令
```bash
bun dev &  sleep 5
ID=$(sqlite3 data/skills.db "select id from skills where status='ok' limit 1;")
SLUG=$(sqlite3 data/skills.db "select slug from skills where id='$ID';")
curl -s -X POST "localhost:4317/api/skills/$ID/install" -H 'content-type: application/json' \
  -d '{"tool_id":"agents","mode":"symlink"}' | jq -e '.ok'                      # 期望：true
test -L "$HOME/.agents/skills/$SLUG"                                             # 期望：退出码 0
sqlite3 data/skills.db "select install_mode from skill_tools where skill_id='$ID' and tool_id='agents';"  # 期望：symlink
rm -rf "$HOME/.agents/skills/$SLUG"
curl -s -X DELETE "localhost:4317/api/skills/$ID/install/agents" | jq -e '.ok'   # 期望：true
# 二次卸载返回 NOT_MANAGED
curl -s -X DELETE "localhost:4317/api/skills/$ID/install/agents" | jq -e '.error.code == "NOT_MANAGED"'  # 期望：true
kill %1