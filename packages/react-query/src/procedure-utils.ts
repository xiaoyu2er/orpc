import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/react-query'
import type { InfiniteOptionsBase, InfiniteOptionsIn, MutationOptionsBase, MutationOptionsIn, QueryOptionsBase, QueryOptionsIn } from './types'
import { buildKey } from './key'

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
        queryKey: buildKey(path, { type: 'query', input: input as any }),
        queryFn: ({ signal }) => client(input as any, { signal, context: context as any }),
        ...(rest as any),
      }
    },

    infiniteOptions({ input, context, ...rest }) {
      return {
        queryKey: buildKey(path, { type: 'infinite', input: input(rest.initialPageParam) as any }),
        queryFn: ({ pageParam, signal }) => {
          return client(input(pageParam as any), { signal, context: context as any })
        },
        ...(rest as any),
      }
    },

    mutationOptions(...[{ context, ...rest } = {}]) {
      return {
        mutationKey: buildKey(path, { type: 'mutation' }),
        mutationFn: input => client(input, { context: context as any }),
        ...(rest as any),
      }
    },
  }
}
