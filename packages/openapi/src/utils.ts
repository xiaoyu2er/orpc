import type { HTTPPath } from '@orpc/contract'

export function standardizeHTTPPath(path: HTTPPath): HTTPPath {
  return `/${path.replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '')}`
}

export function toOpenAPI31RoutePattern(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\{\+([^}]+)\}/g, '{$1}')
}
