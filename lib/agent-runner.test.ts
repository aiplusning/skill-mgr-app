import { describe, expect, test } from 'bun:test'
import { assembleSystemPrompt, buildSnapshot, SKILL_PROMPT_SEPARATOR } from './agent-runner'

const agent = { system_prompt: '' }

describe('assembleSystemPrompt', () => {
  test('returns an empty string when there are no skills and no system prompt', () => {
    expect(assembleSystemPrompt(agent, [])).toBe('')
  })

  test('returns the body for one skill', () => {
    expect(assembleSystemPrompt(agent, [{ skill_id: 's1', name: 'One', body: 'single body' }])).toBe('single body')
  })

  test('joins skills in order_index order with the documented separator', () => {
    const skills = [
      { skill_id: 's2', name: 'Second', body: 'second', order_index: 1 },
      { skill_id: 's0', name: 'First', body: 'first', order_index: 0 },
      { skill_id: 's1', name: 'Third', body: 'third', order_index: 2 },
    ]
    expect(assembleSystemPrompt(agent, skills)).toBe(['first', 'second', 'third'].join(SKILL_PROMPT_SEPARATOR))
  })

  test('places the extra system prompt before the Skill bodies', () => {
    expect(assembleSystemPrompt({ system_prompt: 'Follow these rules.' }, [{ name: 'One', body: 'Skill body' }]))
      .toBe(`Follow these rules.\n\nSkill body`)
  })

  test('keeps a system prompt when no skills are attached', () => {
    expect(assembleSystemPrompt({ system_prompt: 'Only prefix' }, [])).toBe('Only prefix')
  })
})

describe('buildSnapshot', () => {
  test('returns skill IDs, names, and order in ascending order_index', () => {
    const skills = [
      { skill_id: 's2', name: 'Second', order_index: 2 },
      { skill_id: 's0', name: 'First', order_index: 0 },
      { skill_id: 's1', name: 'Middle', order_index: 1 },
    ]
    expect(buildSnapshot(agent, skills)).toEqual([
      { skill_id: 's0', name: 'First', order_index: 0 },
      { skill_id: 's1', name: 'Middle', order_index: 1 },
      { skill_id: 's2', name: 'Second', order_index: 2 },
    ])
  })
})
