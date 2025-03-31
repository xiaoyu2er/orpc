import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { _EmptyObject } from '@pinia/colada'
import type { MutationOptions, MutationOptionsIn, QueryOptions, QueryOptionsIn } from './types'
import { computed, toValue } from 'vue'
import { buildKey } from './key'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError> {
  call: Client<TClientContext, TInput, TOutput, TError>

  queryOptions<UInitialData extends TOutput | undefined = TOutput | undefined>(
    ...rest: MaybeOptionalOptions<
      QueryOptionsIn<TClientContext, TInput, TOutput, TError, UInitialData>
    >
  ): QueryOptions<TOutput, TError, UInitialData>

  mutationOptions<UMutationContext extends Record<any, any> = _EmptyObject>(
    ...rest: MaybeOptionalOptions<
      MutationOptionsIn<TClientContext, TInput, TOutput, TError, UMutationContext>
    >
  ): MutationOptions<TInput, TOutput, TError, UMutationContext>
}

export interface CreateProcedureUtilsOptions {
  path: string[]
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  options: CreateProcedureUtilsOptions,
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    call: client,

    queryOptions(...[{ input, context, ...rest } = {}]) {
      return {
        key: computed(() => buildKey(options.path, { input: toValue(input) })),
        query: ({ signal }) => client(toValue(input) as any, { signal, context: toValue(context) as any }),
        ...(rest as any),
      }
    },

    mutationOptions(...[{ context, ...rest } = {}]) {
      return {
        key: input => buildKey(options.path, { input }),
        mutation: input => client(input, { context: toValue(context) as any }),
        ...(rest as any),
      }
    },
  }
}
