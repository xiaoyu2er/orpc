import type { Client } from '@orpc/contract'
import type { MutationOptions, MutationOptionsExtra, QueryOptions, QueryOptionsExtra } from './types'
import { computed } from 'vue'
import { buildKey } from './key'
import { deepUnref } from './utils'

/**
 * Utils at procedure level
 */
export interface ProcedureUtils<TClientContext, TInput, TOutput, TError extends Error> {
  queryOptions: <U extends QueryOptionsExtra<TClientContext, TInput, TOutput, TError>>(
    ...opt: [options: U] | (undefined extends TInput & TClientContext ? [] : never)
  ) => QueryOptions<TOutput, TError>

  mutationOptions: <U extends MutationOptionsExtra<TClientContext, TInput, TOutput, TError>>(
    ...opt: [options: U] | (undefined extends TClientContext ? [] : never)
  ) => MutationOptions<TInput, TOutput, TError>
}

export function createProcedureUtils<TClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    queryOptions(...[options]) {
      const input = options?.input as any

      return {
        key: computed(() => buildKey(path, { input: deepUnref(input) })),
        query: ({ signal }) => client(deepUnref(input), { signal, context: deepUnref(options?.context) } as any),
        ...(options as any),
      }
    },

    mutationOptions(...[options]) {
      return {
        key: input => buildKey(path, { input }),
        mutation: (input, _) => client(input, { context: deepUnref(options?.context) } as any),
        ...(options as any),
      }
    },
  }
}
