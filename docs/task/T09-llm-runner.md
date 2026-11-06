
---

### 文件：`docs/tasks/T09-llm-runner.md`

```markdown
# T09 · LLM 封装 + Provider 管理

## 依赖
- T03

## 先读
- docs/REQUIREMENTS.md §四 M4（测试台）
- docs/REQUIREMENTS.md §五（安全硬约束：api_key 打码）
- docs/REQUIREMENTS.md §八 第 2、5 条

## 产出（文件清单）
- lib/agent-runner.ts
- lib/agent-runner.test.ts
- lib/provider-serializer.ts
- app/api/providers/route.ts
- app/api/providers/[id]/route.ts

## 步骤
1. 安装：`bun add openai`。
2. `lib/agent-runner.ts` 导出两个**纯函数**并先写单测：
   - `assembleSystemPrompt(agent, skills)`：`agent.system_prompt` 为空则直接 `skills.map(s=>s.body).join('\n\n---\n\n')`；非空则 `system_prompt + '\n\n' + join(...)`。
   - `buildSnapshot(agent, skills)`：返回 `[{ skill_id, name, order_index }]` 数组，按 `order_index` 升序。
3. `lib/agent-runner.ts` 再导出 `runCompletion({ provider, systemPrompt, userInput, context? })`：
   - 用 `new OpenAI({ baseURL: provider.base_url, apiKey: provider.api_key })`。
   - `chat.completions.create({ model: provider.model, messages, max_tokens: 1024, timeout: 60000 })`。
   - 返回 `{ output, input_tokens, output_tokens, latency_ms }`。
   - 异常归一化为 `{ code:'LLM_ERROR'|'NO_PROVIDER'|'TIMEOUT', message }`。
4. `lib/provider-serializer.ts`：`toSafeProvider(p)` 返回时把 `api_key` 替换为 `sk-***` + 最后 4 位（空 key 返回 `''`）。
5. `app/api/providers/route.ts`：GET 列表（**必须走 `toSafeProvider`**）、POST 创建。
6. `app/api/providers/[id]/route.ts`：PATCH（允许改 base_url/model/api_key/enabled）、DELETE。
7. `lib/agent-runner.test.ts` 单测覆盖：
   - 0 个 skill + 空 system_prompt → `''`
   - 1 个 skill → 等于 body
   - 3 个 skill → 顺序为 order_index 0/1/2，分隔符 `\n\n---\n\n`
   - 有 system_prompt 前缀 → 前缀在最前
   - `buildSnapshot` 返回顺序正确

## 验收命令
```bash
bun test lib/agent-runner.test.ts                        # 期望：全部 pass
bun dev &  sleep 5
KEY=$(curl -s localhost:4317/api/providers | jq -r '.data[0].api_key')
test "$KEY" = "" -o "${KEY:0:5}" = "sk-*"                # 期望：退出码 0（空或打码）
# 先 PATCH 一个真 key（假 key 也行），再 GET 验证打码
curl -s -X PATCH localhost:4317/api/providers/grok-default -H 'content-type: application/json' \
  -d '{"api_key":"sk-test-1234","enabled":1}' > /dev/null
KEY2=$(curl -s localhost:4317/api/providers | jq -r '.data[0].api_key')
case "$KEY2" in *1234) echo OK;; *) exit 1;; esac        # 期望：末 4 位保留
case "$KEY2" in sk-test*) exit 1;; *) echo OK;; esac     # 期望：不打回原值
kill %1