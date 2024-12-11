import type { Caller } from '@orpc/server'
import type { IsEqual } from '@orpc/shared'
import type { QueryKey } from '@tanstack/vue-query'
import type { InfiniteOptions, MutationOptions, QueryOptions } from './types'
import { buildKey } from './key'
import { deepUnref } from './utils'

/**
 * Utils at procedure level
 */
export interface ProcedureUtils<TInput, TOutput> {
  queryOptions: <U extends QueryOptions<TInput, TOutput, any>>(
    ...options: [U] | (undefined extends TInput ? [] : never)
  ) => IsEqual<U, QueryOptions<TInput, TOutput, any>> extends true
    ? { queryKey: QueryKey, queryFn: () => Promise<TOutput> }
    : Omit<{ queryKey: QueryKey, queryFn: () => Promise<TOutput> }, keyof U> & U

  infiniteOptions: <U extends InfiniteOptions<TInput, TOutput, any>>(
    options: U
  ) => Omit<{ queryKey: QueryKey, queryFn: () => Promise<TOutput>, initialPageParam: undefined }, keyof U> & U

  mutationOptions: <U extends MutationOptions<TInput, TOutput>>(
    options?: U
  ) => IsEqual<U, MutationOptions<TInput, TOutput>> extends true
    ? { mutationKey: QueryKey, mutationFn: (input: TInput) => Promise<TOutput> }
    : Omit<{ mutationKey: QueryKey, mutationFn: (input: TInput) => Promise<TOutput> }, keyof U> & U
}

export function createProcedureUtils<TInput, TOutput>(
  client: Caller<TInput, TOutput>,
  path: string[],
): ProcedureUtils<TInput, TOutput> {
  return {
    queryOptions(...[options]) {
      const input = options?.input as any

      return {
        queryKey: buildKey(path, { type: 'query', input }),
        queryFn: () => client(deepUnref(input)),
        ...(options as any),
      }
    },

    infiniteOptions(options) {
      const input = options.input as any

      return {
        queryKey: buildKey(path, { type: 'infinite', input }),
        queryFn: ({ pageParam }) => client({ ...deepUnref(input), cursor: pageParam }),
        ...(options as any),
      }
    },

    mutationOptions(options) {
      return {
        mutationKey: buildKey(path, { type: 'mutation' }),
        mutationFn: input => client(input),
        ...(options as any),
      }
    },
  }
}
