import type { HTTPPath } from './types'

export function toHttpPath(path: readonly string[]): HTTPPath {
  return `/${path.map(encodeURIComponent).join('/')}`
}
