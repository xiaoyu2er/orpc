import type { HTTPPath } from '@orpc/client/standard'
import { standardizeHTTPPath } from '@orpc/openapi-client/standard'

/**
 * {@link https://github.com/unjs/rou3}
 *
 * @internal
 */
export function toRou3Pattern(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\/\{\+([^}]+)\}/g, '/**:$1').replace(/\/\{([^}]+)\}/g, '/:$1')
}

/**
 * @internal
 */
export function decodeParams(params: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, decodeURIComponent(value)]))
}
