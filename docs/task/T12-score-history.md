
---

### 文件：`docs/tasks/T12-score-history.md`

```markdown
# T12 · 打分 + 历史

## 依赖
- T11

## 先读
- docs/REQUIREMENTS.md §四 M4 第 3、4 点

## 产出（文件清单）
- app/(dashboard)/agents/[id]/_runs-history.tsx
- app/api/runs/[id]/route.ts

## 步骤
1. `app/api/runs/[id]/route.ts`：`PATCH`，body `{ score?: number, score_note?: string }`。
   - `score` 必须在 1..5 之间，否则 422 `SCORE_OUT_OF_RANGE`。
   - 更新后返回该 run。
2. `_runs-history.tsx`：按用例分组列出历史 runs（时间倒序），每条显示 `model / with_agent / latency / score`。点击展开看 output 全文。支持打分行（1–5 星 + note 输入）。
3. 在对比视图下方嵌入该组件。

## 验收命令
```bash
bun dev &  sleep 5
RID=$(sqlite3 data/skills.db "select id from test_runs limit 1;")
curl -s -X PATCH "localhost:4317/api/runs/$RID" -H 'content-type: application/json' \
  -d '{"score":4,"score_note":"ok"}' | jq -e '.ok'                       # 期望：true
sqlite3 data/skills.db "select score from test_runs where id='$RID';"    # 期望：4
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "localhost:4317/api/runs/$RID" \
  -H 'content-type: application/json' -d '{"score":9}')
test "$CODE" = "422"                                                      # 期望：退出码 0
kill %1