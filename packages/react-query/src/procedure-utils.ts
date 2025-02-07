import type { Client } from '@orpc/contract'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/react-query'
import type { InInfiniteOptions, InMutationOptions, InQueryOptions, OutInfiniteOptions, OutMutationOptions, OutQueryOptions } from './types'
import { buildKey } from './key'

export interface ProcedureUtils<TClientContext, TInput, TOutput, TError extends Error> {
  queryOptions<TSelectData = TOutput>(
    ...rest: MaybeOptionalOptions<
      InQueryOptions<TClientContext, TInput, TOutput, TError, TSelectData>
    >
  ): OutQueryOptions<TOutput, TError, TSelectData>

  infiniteOptions<TPageParam, TSelectData = InfiniteData<TOutput>>(
    options: InInfiniteOptions<TClientContext, TInput, TOutput, TError, TSelectData, TPageParam>
  ): OutInfiniteOptions<TOutput, TError, TSelectData, TPageParam>

  mutationOptions(
    ...rest: MaybeOptionalOptions<
      InMutationOptions<TClientContext, TInput, TOutput, TError>
    >
  ): OutMutationOptions<TInput, TOutput, TError>
}

export function createProcedureUtils<TClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
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
