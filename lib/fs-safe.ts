import path from 'node:path'

export class PathOutsideRootsError extends Error {
  readonly code = 'PATH_OUT_OF_ROOTS'

  constructor(target: string) {
    super(`Path is outside the permitted roots: ${target}`)
    this.name = 'PathOutsideRootsError'
  }
}

export function isUnderRoot(target: string, root: string): boolean {
  const resolvedTarget = path.resolve(target)
  const resolvedRoot = path.resolve(root)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

export function resolveUnderRoots(target: string, roots: string[]): string {
  const resolved = path.resolve(target)
  if (!roots.some((root) => isUnderRoot(resolved, root))) throw new PathOutsideRootsError(resolved)
  return resolved
}
