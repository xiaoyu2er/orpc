import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/vue-query'
import type { InfiniteOptionsBase, InfiniteOptionsIn, MutationOptionsBase, MutationOptionsIn, QueryOptionsBase, QueryOptionsIn } from './types'
import { computed } from 'vue'
import { buildKey } from './key'
import { unrefDeep } from './utils'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error> {
  call: Client<TClientContext, TInput, TOutput, TError>

  queryOptions<U, USelectData = TOutput>(
    ...rest: MaybeOptionalOptions<
      U & QueryOptionsIn<TClientContext, TInput, TOutput, TError, USelectData>
    >
  ): NoInfer<U & QueryOptionsBase<TOutput, TError>>

  infiniteOptions<U, UPageParam, USelectData = InfiniteData<TOutput, UPageParam>>(
    options: U & InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, USelectData, UPageParam>
  ): NoInfer<U & InfiniteOptionsBase<TOutput, TError, UPageParam>>

  mutationOptions<U>(
    ...rest: MaybeOptionalOptions<
      U & MutationOptionsIn<TClientContext, TInput, TOutput, TError>
    >
  ): NoInfer<U & MutationOptionsBase<TInput, TOutput, TError>>
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    call: client,

    queryOptions(...[{ input, context, ...rest } = {}]) {
      return {
        queryKey: computed(() => buildKey(path, { type: 'query', input: unrefDeep(input) as any })),
        queryFn: ({ signal }) => client(unrefDeep(input) as any, { signal, context: unrefDeep(context) as any }),
        ...(rest as any),
      }
    },

    infiniteOptions({ input, context, ...rest }) {
      return {
        queryKey: computed(() => {
          return buildKey(path, { type: 'infinite', input: unrefDeep(input(unrefDeep(rest.initialPageParam) as any) as any) })
        }),
        queryFn: ({ pageParam, signal }) => {
          return client(unrefDeep(input(pageParam as any)) as any, { signal, context: unrefDeep(context) as any })
        },
        ...(rest as any),
      }
    },

    mutationOptions(...[{ context, ...rest } = {}]) {
      return {
        mutationKey: buildKey(path, { type: 'mutation' }),
        mutationFn: input => client(input, { context: unrefDeep(context) as any }),
        ...(rest as any),
      }
    },
  }
}
