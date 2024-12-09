import type { QueryKey } from '@tanstack/react-query'
import { buildKey, type BuildKeyOptions } from './key'

/**
 * Utils at any level (procedure or router)
 */
export interface GeneralUtils<TInput> {
  key: (options?: BuildKeyOptions<any, TInput>) => QueryKey
}

export function createGeneralUtils<TInput>(
  prefix: string,
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return buildKey(prefix, path, options)
    },
  }
}
