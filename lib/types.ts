export interface ParsedSkill {
  slug: string
  name: string
  description: string | null
  frontmatter: string | null
  body: string
  dirPath: string
  fileMtime: number
  fileHash: string
  status: 'ok' | 'invalid'
}

export interface ScanError {
  path: string
  message: string
}

export interface ScanResult {
  /** Number of valid Skills found in the selected roots. */
  ok: number
  /** Invalid Skills and their validation reasons. */
  invalid: ScanError[]
  /** Filesystem or parsing errors that prevented processing. */
  errors: ScanError[]
  changed: number
  unchanged: number
}
