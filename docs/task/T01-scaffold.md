# T01 · Next.js 骨架

## 依赖
- 无

## 先读
- docs/REQUIREMENTS.md §三（技术选型）

## 产出（文件清单）
- package.json
- next.config.ts
- tsconfig.json
- app/layout.tsx
- app/page.tsx
- app/api/health/route.ts
- .env.local
- .gitignore

## 步骤
1. 用 `bun create next-app . --ts --tailwind --app --src-dir=false --import-alias "@/*"` 初始化（当前目录已有文件时选择合并，不覆盖 docs/）。
2. 安装 shadcn/ui：`bunx shadcn@latest init -d`，再 `bunx shadcn@latest add button input card dialog tabs table badge tooltip`。
3. `next.config.ts` 中设置 `server: { port: 4317 }`（如 Next 15 不支持该字段，则在 `package.json` 的 dev/start 脚本中加 `-p 4317`）。
4. `app/api/health/route.ts` 返回 `Response.json({ ok: true, ts: Date.now() })`，并加 `export const dynamic = 'force-dynamic'`。
5. `app/page.tsx` 改为一个简单首页，链接到 `/skills` 和 `/agents`（目标页可先 404，不阻塞本卡验收）。
6. `.gitignore` 追加：`data/`、`.env.local`、`docs/logs/`、`node_modules/`、`.next/`。
7. `.env.local` 写入占位：`DB_PATH=./data/skills.db`。

## 验收命令
```bash
bun install                       # 期望：退出码 0
bun dev &                         # 后台启动，等待 5s
sleep 5
curl -s localhost:4317/api/health | grep -q '"ok":true'   # 期望：匹配成功
curl -s localhost:4317/ | grep -qi '<html'                # 期望：匹配成功
kill %1