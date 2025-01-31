import type { Client } from '@orpc/contract'
import type { IsEqual } from '@orpc/shared'
import type { InfiniteOptionsBase, InfiniteOptionsExtra, MutationOptionsBase, MutationOptionsExtra, QueryOptionsBase, QueryOptionsExtra } from './types'
import { computed } from 'vue'
import { buildKey } from './key'
import { deepUnref } from './utils'

/**
 * Utils at procedure level
 */
export interface ProcedureUtils<TClientContext, TInput, TOutput, TError extends Error> {
  queryOptions<U extends QueryOptionsExtra<TClientContext, TInput, TOutput, TError, any>>(
    ...opt: [options: U] | (undefined extends TInput & TClientContext ? [] : never)
  ): IsEqual<U, QueryOptionsExtra<TClientContext, TInput, TOutput, TError, any>> extends true
    ? QueryOptionsBase<TOutput, TError>
    : Omit<QueryOptionsBase<TOutput, TError>, keyof U> & U

  infiniteOptions<U extends InfiniteOptionsExtra<TClientContext, TInput, TOutput, TError, any>>(
    options: U
  ): Omit<InfiniteOptionsBase<TInput, TOutput, TError>, keyof U> & U

  mutationOptions<U extends MutationOptionsExtra<TClientContext, TInput, TOutput, TError>>(
    ...opt: [options: U] | (undefined extends TClientContext ? [] : never)
  ): IsEqual<U, MutationOptionsExtra<TClientContext, TInput, TOutput, TError>> extends true
    ? MutationOptionsBase<TInput, TOutput, TError>
    : Omit<MutationOptionsBase<TInput, TOutput, TError>, keyof U> & U
}

export function createProcedureUtils<TClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    queryOptions(...[options]) {
      const input = options?.input as any

      return {
        queryKey: computed(() => buildKey(path, { type: 'query', input: deepUnref(input) })),
        queryFn: ({ signal }) => client(deepUnref(input), { signal, context: deepUnref(options?.context) } as any),
        ...(options as any),
      }
    },

    infiniteOptions(options) {
      const input = options.input as any

      return {
        initialPageParam: undefined,
        queryKey: computed(() => buildKey(path, { type: 'infinite', input: deepUnref(input) })),
        queryFn: ({ pageParam, signal }: any) => {
          return client({ ...deepUnref(input), cursor: pageParam }, { signal, context: deepUnref(options.context) } as any)
        },
        ...(options as any),
      }
    },

    mutationOptions(...[options]) {
      return {
        mutationKey: buildKey(path, { type: 'mutation' }),
        mutationFn: input => client(input, { context: deepUnref(options?.context) } as any),
        ...(options as any),
      }
    },
  }
}
