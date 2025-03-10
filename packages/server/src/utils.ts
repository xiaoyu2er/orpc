import type { HTTPPath } from '@orpc/contract'

export function toHttpPath(path: readonly string[]): HTTPPath {
  return `/${path.map(encodeURIComponent).join('/')}`
}
