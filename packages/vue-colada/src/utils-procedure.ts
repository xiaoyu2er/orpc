import type { ProcedureClient } from '@orpc/server'
import type { IsEqual } from '@orpc/shared'
import type { EntryKey } from '@pinia/colada'
import type { ComputedRef } from 'vue'
import type { MutationOptions, QueryOptions, UseQueryFnContext } from './types'
import { computed, ref } from 'vue'
import { buildKey } from './key'
import { deepUnref } from './utils'

/**
 * Utils at procedure level
 */
export interface ProcedureUtils<TInput, TOutput, TClientContext> {
  queryOptions: <U extends QueryOptions<TInput, TOutput, TClientContext>>(
    ...opt: [options: U] | (undefined extends TInput & TClientContext ? [] : never)
  ) => IsEqual<U, QueryOptions<TInput, TOutput, TClientContext>> extends true
    ? { key: ComputedRef<EntryKey>, query: (ctx: UseQueryFnContext) => Promise<TOutput> }
    : Omit<{ key: ComputedRef<EntryKey>, query: (ctx: UseQueryFnContext) => Promise<TOutput> }, keyof U> & U

  mutationOptions: <U extends MutationOptions<TInput, TOutput, TClientContext>>(
    ...opt: [options: U] | (undefined extends TClientContext ? [] : never)
  ) => IsEqual<U, MutationOptions<TInput, TOutput, TClientContext>> extends true
    ? { key: (input: TInput) => EntryKey, mutation: (input: TInput) => Promise<TOutput> }
    : Omit<{ key: (input: TInput) => EntryKey, mutation: (input: TInput) => Promise<TOutput> }, keyof U> & U
}

export function createProcedureUtils<TInput, TOutput, TClientContext>(
  client: ProcedureClient<TInput, TOutput, TClientContext>,
  path: string[],
): ProcedureUtils<TInput, TOutput, TClientContext> {
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
