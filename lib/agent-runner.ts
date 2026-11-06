import OpenAI from 'openai'

export const SKILL_PROMPT_SEPARATOR = '\n\n---\n\n'

export interface AgentPromptInput {
  system_prompt?: string | null
}

export interface AgentSkillInput {
  skill_id?: string
  id?: string
  name: string
  body?: string | null
  order_index?: number
}

export interface SkillSnapshotItem {
  skill_id: string
  name: string
  order_index: number
}

function orderedSkills<T extends { order_index?: number }>(skills: T[]): T[] {
  return skills
    .map((skill, originalIndex) => ({ skill, originalIndex }))
    .sort((a, b) => (a.skill.order_index ?? a.originalIndex) - (b.skill.order_index ?? b.originalIndex) || a.originalIndex - b.originalIndex)
    .map(({ skill }) => skill)
}

/** Assemble the system prompt from an optional agent prefix and ordered Skill bodies. */
export function assembleSystemPrompt(agent: AgentPromptInput, skills: AgentSkillInput[]): string {
  const skillPrompt = orderedSkills(skills)
    .map((skill) => skill.body ?? '')
    .join(SKILL_PROMPT_SEPARATOR)
  const prefix = agent.system_prompt?.trim() ?? ''
  if (!prefix) return skillPrompt
  return skillPrompt ? `${prefix}\n\n${skillPrompt}` : prefix
}

/** Build a stable, ordered snapshot for persistence with test runs. */
export function buildSnapshot(_agent: AgentPromptInput, skills: AgentSkillInput[]): SkillSnapshotItem[] {
  return orderedSkills(skills).map((skill, index) => ({
    skill_id: skill.skill_id ?? skill.id ?? '',
    name: skill.name,
    order_index: skill.order_index ?? index,
  }))
}

export interface CompletionProvider {
  id?: string
  base_url: string
  api_key: string
  model: string
  enabled?: number | boolean | null
}

export interface CompletionResult {
  output: string
  input_tokens: number | null
  output_tokens: number | null
  latency_ms: number
}

export type RunnerErrorCode = 'LLM_ERROR' | 'NO_PROVIDER' | 'TIMEOUT'

export class AgentRunnerError extends Error {
  constructor(readonly code: RunnerErrorCode, message: string) {
    super(message)
    this.name = 'AgentRunnerError'
  }
}

export interface RunCompletionInput {
  provider: CompletionProvider | null | undefined
  systemPrompt: string
  userInput: string
  context?: string | null
}

/** Call an OpenAI-compatible chat completion endpoint with a 60-second timeout. */
export async function runCompletion({ provider, systemPrompt, userInput, context }: RunCompletionInput): Promise<CompletionResult> {
  if (!provider || provider.enabled === false || provider.enabled === 0 || !provider.base_url || !provider.model) {
    throw new AgentRunnerError('NO_PROVIDER', 'No enabled, configured LLM provider is available.')
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  const userMessage = context?.trim() ? `Context:\n${context.trim()}\n\nUser input:\n${userInput}` : userInput
  messages.push({ role: 'user', content: userMessage })

  const client = new OpenAI({ baseURL: provider.base_url, apiKey: provider.api_key || 'no-api-key', timeout: 60_000 })
  const startedAt = Date.now()
  try {
    const completion = await client.chat.completions.create({
      model: provider.model,
      messages,
      max_tokens: 1024,
      timeout: 60_000,
    })
    return {
      output: completion.choices[0]?.message?.content ?? '',
      input_tokens: completion.usage?.prompt_tokens ?? null,
      output_tokens: completion.usage?.completion_tokens ?? null,
      latency_ms: Date.now() - startedAt,
    }
  } catch (error) {
    if (error instanceof OpenAI.APIConnectionTimeoutError || (error instanceof Error && (error.name === 'AbortError' || error.name.toLowerCase().includes('timeout')))) {
      throw new AgentRunnerError('TIMEOUT', 'The LLM request timed out after 60 seconds.')
    }
    const message = error instanceof Error ? error.message : 'The LLM request failed.'
    throw new AgentRunnerError('LLM_ERROR', message)
  }
}
