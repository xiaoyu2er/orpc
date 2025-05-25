import type { BuildKeyOptions, OperationType } from '@orpc/tanstack-query'
import type { QueryKey } from '@tanstack/solid-query'
import { buildKey } from '@orpc/tanstack-query'

/**
 * Utils at any level (procedure or router)
 */
export interface GeneralUtils<TInput> {
  /**
   * Generate a query/mutation key for checking status, invalidate, set, get, etc.
   *
   * @see {@link https://orpc.unnoq.com/docs/tanstack-query/basic#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  key<UType extends OperationType>(options?: BuildKeyOptions<UType, TInput>): QueryKey
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
