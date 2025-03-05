import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions, SetOptional } from '@orpc/shared'
import type { DataTag, DefinedInitialDataInfiniteOptions, DefinedInitialDataOptions, InfiniteData, QueryKey, SkipToken, UndefinedInitialDataInfiniteOptions, UndefinedInitialDataOptions, UnusedSkipTokenInfiniteOptions, UnusedSkipTokenOptions, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import type { ORPCInfiniteOptions, ORPCMutationOptions, ORPCQueryOptions } from './types'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { buildKey } from './key'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error> {
  call: Client<TClientContext, TInput, TOutput, TError>

  queryOptions<UData = TOutput, UQueryKey extends QueryKey = QueryKey>(
    options:
      & ORPCQueryOptions<TInput, TClientContext>
      & SetOptional<DefinedInitialDataOptions<TOutput, TError, UData, UQueryKey>, 'queryKey'>
  ): Omit<DefinedInitialDataOptions<TOutput, TError, UData, UQueryKey>, 'queryFn'> & {
    queryFn?: Exclude<UseQueryOptions<TOutput, TError, UData, UQueryKey>['queryFn'], SkipToken | undefined>
    queryKey: DataTag<UQueryKey, TOutput, TError>
  }

  queryOptions<UData = TOutput, UQueryKey extends QueryKey = QueryKey>(
    ...rest: MaybeOptionalOptions<
      & ORPCQueryOptions<TInput, TClientContext>
      & SetOptional<UnusedSkipTokenOptions<TOutput, TError, UData, UQueryKey>, 'queryKey'>
    >
  ): UnusedSkipTokenOptions<TOutput, TError, UData, UQueryKey> & {
    queryKey: DataTag<UQueryKey, TOutput, TError>
  }

  queryOptions<UData = TOutput, UQueryKey extends QueryKey = QueryKey>(
    options:
      & ORPCQueryOptions<TInput, TClientContext>
      & SetOptional<UndefinedInitialDataOptions<TOutput, TError, UData, UQueryKey>, 'queryKey'>
  ): UndefinedInitialDataOptions<TOutput, TError, UData, UQueryKey> & {
    queryKey: DataTag<UQueryKey, TOutput, TError>
  }

  infiniteOptions<UPageParam, UData = InfiniteData<TOutput, UPageParam>, UQueryKey extends QueryKey = QueryKey>(
    options:
      & ORPCInfiniteOptions<TClientContext, TInput, UPageParam>
      & SetOptional<DefinedInitialDataInfiniteOptions<TOutput, TError, UData, UQueryKey, UPageParam>, 'queryKey'>
  ): DefinedInitialDataInfiniteOptions<TOutput, TError, UData, UQueryKey, UPageParam> & {
    queryKey: DataTag<UPageParam, InfiniteData<TOutput>, TError>
  }

  infiniteOptions<UPageParam, UData = InfiniteData<TOutput, UPageParam>, UQueryKey extends QueryKey = QueryKey>(
    options:
      & ORPCInfiniteOptions<TClientContext, TInput, UPageParam>
      & SetOptional<UnusedSkipTokenInfiniteOptions<TOutput, TError, UData, UQueryKey, UPageParam>, 'queryKey'>
  ): UnusedSkipTokenInfiniteOptions<TOutput, TError, UData, UQueryKey, UPageParam> & {
    queryKey: DataTag<UPageParam, InfiniteData<TOutput>, TError>
  }

  infiniteOptions<UPageParam, UData = InfiniteData<TOutput, UPageParam>, UQueryKey extends QueryKey = QueryKey>(
    options:
      & ORPCInfiniteOptions<TClientContext, TInput, UPageParam>
      & SetOptional<UndefinedInitialDataInfiniteOptions<TOutput, TError, UData, UQueryKey, UPageParam>, 'queryKey'>
  ): UndefinedInitialDataInfiniteOptions<TOutput, TError, UData, UQueryKey, UPageParam> & {
    queryKey: DataTag<UPageParam, InfiniteData<TOutput>, TError>
  }

  mutationOptions<UMutationContext>(
    ...rest: MaybeOptionalOptions<
      & ORPCMutationOptions<TClientContext>
      & UseMutationOptions<TOutput, TError, TInput, UMutationContext>
    >
  ): UseMutationOptions<TOutput, TError, TInput, UMutationContext>
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  path: string[],
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    call: client,

    queryOptions: ((...[{ input, context, ...rest } = {} as any]) => queryOptions({
      queryKey: buildKey(path, { type: 'query', input: input as any }),
      queryFn: ({ signal }) => client(input as any, { signal, context: context as any }),
      ...(rest as any),
    })) as any,

    infiniteOptions({ input, context, ...rest }) {
      return infiniteQueryOptions({
        queryKey: buildKey(path, { type: 'infinite', input: input(rest.initialPageParam) as any }),
        queryFn: ({ pageParam, signal }) => {
          return client(input(pageParam as any), { signal, context: context as any })
        },
        ...(rest as any),
      }) as any
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
