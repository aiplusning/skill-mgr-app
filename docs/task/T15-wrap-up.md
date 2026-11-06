
---

### 文件：`docs/tasks/T15-wrap-up.md`

```markdown
# T15 · 收尾 + 冒烟

## 依赖
- T12、T13、T14

## 先读
- docs/REQUIREMENTS.md §十（交付物清单）

## 产出（文件清单）
- README.md
- scripts/status.ts
- scripts/smoke.sh
- scripts/seed.ts
- app/(dashboard)/_error-state.tsx
- app/(dashboard)/_empty-state.tsx

## 步骤
1. `scripts/status.ts`：读 `docs/STATUS.json`，终端输出一张表（符号 `✓ ● ○ ✗ ⊘` 对应 passed/running/pending/failed/blocked），末尾打印 `[N/15]` 与当前任务。
2. `scripts/seed.ts`：
   - 确保 `seed/skills/demo-alpha`…`demo-delta`、`demo-broken` 五个 Skill 存在（若 T03 已建则跳过）。
   - 创建 1 个示例 Agent（名 `seed-agent`），组合 demo-alpha + demo-beta（order 0/1）。
   - 为该 Agent 建 2 个用例。
3. `scripts/smoke.sh`：8 步断言，全绿退出码 0：
   1. `POST /api/scan` 返回 ok
   2. `GET /api/skills` 有数据
   3. 存一条草稿到某 skill，变体 +1
   4. 恢复该草稿 → 新增备份 +1
   5. `POST /api/agents` 建 agent
   6. `PUT /api/agents/:id/skills` 组 2 个 skill
   7. `POST /api/cases/:id/preview` 返回非空 system_prompt
   8. `POST /api/skills/:id/install`（tool=agents, mode=copy）+ 卸载 → `skill_tools` 先 +1 后 -1
4. `_error-state.tsx` / `_empty-state.tsx`：两个通用组件，供各页面复用。
5. `README.md`：必含
   - 启动：`bun install && bun run db:migrate && bun dev`（端口 4317）
   - 默认扫描路径：`~/.claude/skills`、`~/.grok/skills`、`~/.agents/skills`、`seed/skills`
   - Provider 配置步骤
   - 三种保存方式对比表（文件 / SQLite 变体 / 导出）
   - v2 预留项（Git 推送、用户系统）明确写“未实现”

## 验收命令
```bash
bun dev &  sleep 5
bash scripts/smoke.sh                                    # 期望：退出码 0，输出 8 PASS
bun scripts/status.ts | grep -qE '\[(1[0-5]|[0-9])/15\]' # 期望：匹配
curl -s localhost:4317/skills > /dev/null                 # 期望：退出码 0
grep -qi 'v2' README.md && grep -qi 'git.*push\|推送' README.md   # 期望：说明存在
kill %1