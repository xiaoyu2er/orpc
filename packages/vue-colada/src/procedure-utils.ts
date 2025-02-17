import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { MutationOptions, MutationOptionsIn, QueryOptions, QueryOptionsIn } from './types'
import { computed } from 'vue'
import { buildKey } from './key'
import { unrefDeep } from './utils'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error> {
  call: Client<TClientContext, TInput, TOutput, TError>

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

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    call: client,

    queryOptions(...[{ input, context, ...rest } = {}]) {
      return {
        key: computed(() => buildKey(path, { input: unrefDeep(input) })),
        query: ({ signal }) => client(unrefDeep(input) as any, { signal, context: unrefDeep(context) as any }),
        ...(rest as any),
      }
    },

    mutationOptions(...[{ context, ...rest } = {}]) {
      return {
        key: input => buildKey(path, { input }),
        mutation: input => client(input, { context: unrefDeep(context) as any }),
        ...(rest as any),
      }
    },
  }
}
