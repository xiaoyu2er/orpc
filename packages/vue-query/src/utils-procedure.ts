import type { Client } from '@orpc/contract'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/vue-query'
import type { InfiniteOptionsBase, InfiniteOptionsIn, MutationOptionsBase, MutationOptionsIn, QueryOptionsBase, QueryOptionsIn } from './types'
import { computed } from 'vue'
import { buildKey } from './key'
import { deepUnref } from './utils'

export interface ProcedureUtils<TClientContext, TInput, TOutput, TError extends Error> {
  queryOptions<U, USelectData = TOutput>(
    ...rest: MaybeOptionalOptions<
      U & QueryOptionsIn<TClientContext, TInput, TOutput, TError, USelectData>
    >
  ): NoInfer<U & QueryOptionsBase<TOutput, TError>>

  infiniteOptions<U, UPageParam, USelectData = InfiniteData<TOutput>>(
    options: U & InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, USelectData, UPageParam>
  ): NoInfer<U & InfiniteOptionsBase<TOutput, TError, UPageParam>>

  mutationOptions<U>(
    ...rest: MaybeOptionalOptions<
      U & MutationOptionsIn<TClientContext, TInput, TOutput, TError>
    >
  ): NoInfer<U & MutationOptionsBase<TInput, TOutput, TError>>
}

export function createProcedureUtils<TClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    queryOptions(...[{ input, context, ...rest } = {}]) {
      return {
        queryKey: computed(() => buildKey(path, { type: 'query', input: deepUnref(input) as any })),
        queryFn: ({ signal }) => client(deepUnref(input) as any, { signal, context: deepUnref(context) as any }),
        ...(rest as any),
      }
    },

    infiniteOptions({ input, context, ...rest }) {
      return {
        queryKey: computed(() => {
          return buildKey(path, { type: 'infinite', input: deepUnref(input(deepUnref(rest.initialPageParam) as any) as any) })
        }),
        queryFn: ({ pageParam, signal }: any) => {
          return client(deepUnref(input(pageParam)) as any, { signal, context: deepUnref(context) as any })
        },
        ...(rest as any),
      }
    },

    mutationOptions(...[{ context, ...rest } = {}]) {
      return {
        mutationKey: buildKey(path, { type: 'mutation' }),
        mutationFn: input => client(input, { context: deepUnref(context) as any }),
        ...(rest as any),
      }
    },
  }
}
