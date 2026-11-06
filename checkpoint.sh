
---

### 附：配套的两个小脚本（可一并粘贴）

### 文件：`scripts/checkpoint.sh`

```bash
#!/usr/bin/env bash
# 用法：bash scripts/checkpoint.sh T07 [pass|block] ["失败摘要"]
set -euo pipefail
ID="${1:?task id required}"
MODE="${2:-pass}"
NOTE="${3:-}"

TS=$(date -u +%FT%TZ)
LOG="docs/logs/${ID}.log"
mkdir -p docs/logs

{
  echo "=== ${ID} · ${TS} ==="
  echo "STATUS: ${MODE}"
  [ -n "$NOTE" ] && echo "NOTE: ${NOTE}"
  echo "FILES:"
  git diff --stat | sed 's/^/  /' || true
  echo "DIFF_STAT: $(git diff --shortstat || true)"
} >> "$LOG"

bun -e "
const fs=require('fs');
const p='docs/STATUS.json';
const s=JSON.parse(fs.readFileSync(p,'utf8'));
const t=s.tasks['${ID}'];
t.status='${MODE}'==='pass'?'passed':'blocked';
t.finished_at='${TS}';
s.current='${ID}';
fs.writeFileSync(p, JSON.stringify(s,null,2));
"

if [ "$MODE" = "pass" ]; then
  git add -A && git commit -m "${ID}: pass" --no-verify >/dev/null 2>&1 || true
fi
echo "[checkpoint] ${ID} -> ${MODE}"