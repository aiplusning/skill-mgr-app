import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export class PathOutsideRootsError extends Error {
  readonly code = 'PATH_OUT_OF_ROOTS'

  constructor(target: string) {
    super(`Path is outside the permitted roots: ${target}`)
    this.name = 'PathOutsideRootsError'
  }
}

function isWithinResolvedRoot(target: string, root: string): boolean {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

export function isUnderRoot(target: string, root: string): boolean {
  return isWithinResolvedRoot(path.resolve(target), path.resolve(root))
}

export function resolveUnderRoots(target: string, roots: string[]): string {
  const resolved = path.resolve(target)
  if (!roots.some((root) => isUnderRoot(resolved, root))) throw new PathOutsideRootsError(resolved)
  return resolved
}

/** Write a file after validating both lexical and real filesystem paths against an allowlisted root. */
export function writeUnderRoots(absPath: string, content: string, roots: string[]): string {
  if (!path.isAbsolute(absPath)) throw new PathOutsideRootsError(absPath)
  const target = resolveUnderRoots(absPath, roots)
  const root = roots.map((candidate) => path.resolve(candidate)).find((candidate) => isWithinResolvedRoot(target, candidate))
  if (!root) throw new PathOutsideRootsError(target)

  const realRoot = realpathSync(root)
  const parent = path.dirname(target)
  const realParent = realpathSync(parent)
  if (!isWithinResolvedRoot(realParent, realRoot)) throw new PathOutsideRootsError(target)

  writeFileSync(target, content, 'utf8')
  return target
}

/** Export to a user-selected, existing directory; the Skill slug is kept as one safe path segment. */
export function writeUnderDir(targetDir: string, slug: string, content: string): string {
  if (!path.isAbsolute(targetDir) || targetDir.split(/[\\/]/).includes('..')) {
    throw new PathOutsideRootsError(targetDir)
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(slug) || slug === '.' || slug === '..') {
    throw new PathOutsideRootsError(slug)
  }
  const resolvedDir = path.resolve(targetDir)
  if (!existsSync(resolvedDir) || !realpathSync(resolvedDir) || !isWithinResolvedRoot(resolvedDir, resolvedDir)) {
    throw new PathOutsideRootsError(targetDir)
  }
  const realDir = realpathSync(resolvedDir)
  const skillDir = path.join(realDir, slug)
  mkdirSync(skillDir, { recursive: true })
  const realSkillDir = realpathSync(skillDir)
  if (!isWithinResolvedRoot(realSkillDir, realDir)) throw new PathOutsideRootsError(skillDir)
  const target = path.join(realSkillDir, 'SKILL.md')
  writeFileSync(target, content, 'utf8')
  return target
}
