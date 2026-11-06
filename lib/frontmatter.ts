import matter from 'gray-matter'

export interface ParsedFrontmatter {
  data: Record<string, unknown>
  content: string
  frontmatter: string | null
  error?: string
}

export function parse(text: string): ParsedFrontmatter {
  try {
    const result = matter(text)
    const match = text.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)
    return {
      data: result.data as Record<string, unknown>,
      content: result.content,
      frontmatter: match?.[1] ?? null,
    }
  } catch (error) {
    return {
      data: {},
      content: text,
      frontmatter: null,
      error: error instanceof Error ? error.message : 'Unable to parse frontmatter',
    }
  }
}

export function validateNameMatchesSlug(data: Record<string, unknown>, slug: string): { ok: boolean; reason?: string } {
  if (typeof data.name !== 'string' || !data.name.trim()) return { ok: false, reason: 'frontmatter must contain a non-empty name' }
  if (data.name.trim() !== slug) return { ok: false, reason: `frontmatter name must equal slug "${slug}"` }
  return { ok: true }
}
