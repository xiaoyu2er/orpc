import type { Client } from '@orpc/contract'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { MutationOptions, MutationOptionsIn, QueryOptions, QueryOptionsIn } from './types'
import { computed } from 'vue'
import { buildKey } from './key'
import { deepUnref } from './utils'

export interface ProcedureUtils<TClientContext, TInput, TOutput, TError extends Error> {
  queryOptions(
    ...rest: MaybeOptionalOptions<
      QueryOptionsIn<TClientContext, TInput, TOutput, TError>
    >
  ): QueryOptions<TOutput, TError>

  mutationOptions(
    ...rest: MaybeOptionalOptions<
      MutationOptionsIn<TClientContext, TInput, TOutput, TError>
    >
  ): MutationOptions<TInput, TOutput, TError>
}

export function createProcedureUtils<TClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    queryOptions(...[{ input, context, ...rest } = {}]) {
      return {
        key: computed(() => buildKey(path, { input: deepUnref(input) })),
        query: ({ signal }) => client(deepUnref(input) as any, { signal, context: deepUnref(context) as any }),
        ...(rest as any),
      }
    },

    mutationOptions(...[{ context, ...rest } = {}]) {
      return {
        key: input => buildKey(path, { input }),
        mutation: input => client(input, { context: deepUnref(context) as any }),
        ...(rest as any),
      }
    },
  }
}
