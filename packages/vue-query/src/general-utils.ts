import type { QueryKey } from '@tanstack/vue-query'
import type { BuildKeyOptions, KeyType } from './key'
import { buildKey } from './key'

export interface GeneralUtils<TInput> {
  /**
   * Generate a query/mutation key for checking status, invalidate, set, get, etc.
   *
   * @see {@link https://orpc.unnoq.com/docs/tanstack-query/basic#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  key<UType extends KeyType = undefined>(options?: BuildKeyOptions<UType, TInput>): QueryKey
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return buildKey(path, options)
    },
  }
}
