import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/vue-query'
import type { InfiniteOptionsBase, InfiniteOptionsIn, MutationOptions, MutationOptionsIn, QueryOptionsBase, QueryOptionsIn } from './types'
import { computed } from 'vue'
import { buildKey } from './key'
import { unrefDeep } from './utils'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error> {
  call: Client<TClientContext, TInput, TOutput, TError>

  queryOptions<U, USelectData = TOutput>(
    ...rest: MaybeOptionalOptions<
      U & QueryOptionsIn<TClientContext, TInput, TOutput, TError, USelectData>
    >
  ): NoInfer<U & Omit<QueryOptionsBase<TOutput, TError>, keyof U>>

  infiniteOptions<U, UPageParam, USelectData = InfiniteData<TOutput, UPageParam>>(
    options: U & InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, USelectData, UPageParam>
  ): NoInfer<U & Omit<InfiniteOptionsBase<TOutput, TError, UPageParam>, keyof U>>

  mutationOptions<UMutationContext>(
    ...rest: MaybeOptionalOptions<MutationOptionsIn<TClientContext, TInput, TOutput, TError, UMutationContext>>
  ): MutationOptions<TInput, TOutput, TError, UMutationContext>
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    call: client,

    queryOptions(...[options = {} as any]) {
      return {
        queryKey: computed(() => buildKey(path, { type: 'query', input: unrefDeep(options.input) })),
        queryFn: ({ signal }) => client(unrefDeep(options.input), { signal, context: unrefDeep(options.context) }),
        ...options,
      }
    },

    infiniteOptions(options) {
      return {
        queryKey: computed(() => {
          return buildKey(path, { type: 'infinite', input: unrefDeep(options.input(unrefDeep(options.initialPageParam) as any) as any) })
        }),
        queryFn: ({ pageParam, signal }) => {
          return client(unrefDeep(options.input(pageParam as any)) as any, { signal, context: unrefDeep(options.context) as any })
        },
        ...(options as any),
      }
    },

    mutationOptions(...[options = {} as any]) {
      return {
        mutationKey: buildKey(path, { type: 'mutation' }),
        mutationFn: input => client(input, { context: unrefDeep(options.context) }),
        ...(options as any),
      }
    },
  }
}
