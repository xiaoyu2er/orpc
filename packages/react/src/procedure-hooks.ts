import type { InferCursor, SchemaInputForInfiniteQuery } from './types'
import {
  get,
  type PartialOnUndefinedDeep,
  type SetOptional,
} from '@orpc/shared'
import {
  type DefaultError,
  type FetchInfiniteQueryOptions,
  type FetchQueryOptions,
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  usePrefetchInfiniteQuery,
  usePrefetchQuery,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  useSuspenseInfiniteQuery,
  type UseSuspenseInfiniteQueryOptions,
  type UseSuspenseInfiniteQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query'
import { orpcPathSymbol } from './orpc-path'
import { type ORPCContext, useORPCContext } from './react-context'
import { getMutationKeyFromPath, getQueryKeyFromPath } from './tanstack-key'

export interface ProcedureHooks<TInput, TOutput> {
  useQuery: <USelectData = TOutput>(
    input: TInput,
    options?: SetOptional<
      UseQueryOptions<
        TOutput,
        DefaultError,
        USelectData
      >,
      'queryFn' | 'queryKey'
    >,
  ) => UseQueryResult<USelectData>
  useInfiniteQuery: <
    USelectData = InfiniteData<
      TOutput,
      InferCursor<TInput>
    >,
  >(
    options: PartialOnUndefinedDeep<
      SetOptional<
        UseInfiniteQueryOptions<
          TOutput,
          DefaultError,
          USelectData,
          TOutput,
          QueryKey,
          InferCursor<TInput>
        >,
        'queryFn' | 'queryKey'
      > & {
        input: SchemaInputForInfiniteQuery<TInput>
      }
    >,
  ) => UseInfiniteQueryResult<USelectData>

  useSuspenseQuery: <USelectData = TOutput>(
    input: TInput,
    options?: SetOptional<
      UseSuspenseQueryOptions<
        TOutput,
        DefaultError,
        USelectData
      >,
      'queryFn' | 'queryKey'
    >,
  ) => UseSuspenseQueryResult<USelectData>
  useSuspenseInfiniteQuery: <
    USelectData = InfiniteData<
      TOutput,
      InferCursor<TInput>
    >,
  >(
    options: PartialOnUndefinedDeep<
      SetOptional<
        UseSuspenseInfiniteQueryOptions<
          TOutput,
          DefaultError,
          USelectData,
          TOutput,
          QueryKey,
          InferCursor<TInput>
        >,
        'queryFn' | 'queryKey'
      > & {
        input: SchemaInputForInfiniteQuery<TInput>
      }
    >,
  ) => UseSuspenseInfiniteQueryResult<USelectData>

  usePrefetchQuery: (
    input: TInput,
    options?: FetchQueryOptions<TOutput>,
  ) => void
  usePrefetchInfiniteQuery: (
    options: PartialOnUndefinedDeep<
      SetOptional<
        FetchInfiniteQueryOptions<
          TOutput,
          DefaultError,
          TOutput,
          QueryKey,
          InferCursor<TInput>
        >,
        'queryKey' | 'queryFn'
      > & {
        input: SchemaInputForInfiniteQuery<TInput>
      }
    >,
  ) => void

  useMutation: (
    options?: SetOptional<
      UseMutationOptions<
        TOutput,
        DefaultError,
        TInput
      >,
      'mutationFn' | 'mutationKey'
    >,
  ) => UseMutationResult<
    TOutput,
    DefaultError,
    TInput
  >
}

export interface CreateProcedureHooksOptions {
  context: ORPCContext<any>

  /**
   * The path of the procedure on server.
   *
   * @internal
   */
  path: string[]
}

export function createProcedureHooks<TInput, TOutput>(
  options: CreateProcedureHooksOptions,
): ProcedureHooks<TInput, TOutput> {
  return {
    [orpcPathSymbol as any]: options.path,

    useQuery(input, options_) {
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
          queryFn: ({ signal }) => client(input, { signal }),
          ...options_,
        },
        context.queryClient,
      )
    },
    useInfiniteQuery(options_) {
      const { input, ...rest } = options_
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useInfiniteQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: 'infinite',
          }),
          queryFn: ({ pageParam, signal }) =>
            client({ ...(input as any), cursor: pageParam }, { signal }),
          ...(rest as any),
        },
        context.queryClient,
      )
    },

    useSuspenseQuery(input, options_) {
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useSuspenseQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
          queryFn: ({ signal }) => client(input, { signal }),
          ...options_,
        },
        context.queryClient,
      )
    },
    useSuspenseInfiniteQuery(options_) {
      const { input, ...rest } = options_
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useSuspenseInfiniteQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: 'infinite',
          }),
          queryFn: ({ pageParam, signal }) =>
            client({ ...(input as any), cursor: pageParam }, { signal }),
          ...(rest as any),
        },
        context.queryClient,
      )
    },

    usePrefetchQuery(input, options_) {
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return usePrefetchQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
          queryFn: ({ signal }) => client(input, { signal }),
          ...options_,
        },
        context.queryClient,
      )
    },
    usePrefetchInfiniteQuery(options_) {
      const { input, ...rest } = options_
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return usePrefetchInfiniteQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: 'infinite',
          }),
          queryFn: ({ pageParam, signal }) =>
            client({ ...(input as any), cursor: pageParam }, { signal }),
          ...(rest as any),
        },
        context.queryClient,
      )
    },

    useMutation(options_) {
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useMutation(
        {
          mutationKey: getMutationKeyFromPath(options.path),
          mutationFn: input => client(input),
          ...options_,
        },
        context.queryClient,
      )
    },
  }
}
