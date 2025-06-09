import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { DataTag, InfiniteData, QueryKey } from '@tanstack/query-core'
import type {
  experimental_StreamedKeyOptions,
  experimental_StreamedQueryOutput,
  InfiniteOptionsBase,
  InfiniteOptionsIn,
  MutationOptions,
  MutationOptionsIn,
  OperationContext,
  QueryKeyOptions,
  QueryOptionsBase,
  QueryOptionsIn,
  experimental_StreamedOptionsBase as StreamedOptionsBase,
  experimental_StreamedOptionsIn as StreamedOptionsIn,
} from './types'
import { isAsyncIteratorObject } from '@orpc/shared'
import { experimental_streamedQuery, skipToken } from '@tanstack/query-core'
import { generateOperationKey } from './key'
import {
  OPERATION_CONTEXT_SYMBOL,
} from './types'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError> {
  /**
   * Calling corresponding procedure client
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#calling-clients Tanstack Calling Procedure Client Docs}
   */
  call: Client<TClientContext, TInput, TOutput, TError>

  /**
   * Generate the key used for query options
   */
  queryKey(
    ...rest: MaybeOptionalOptions<
      QueryKeyOptions<TInput>
    >
  ): DataTag<QueryKey, TOutput, TError>

  /**
   * Generate options used for useQuery/useSuspenseQuery/prefetchQuery/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#query-options Tanstack Query Options Utility Docs}
   */
  queryOptions<U, USelectData = TOutput>(
    ...rest: MaybeOptionalOptions<
      U & QueryOptionsIn<TClientContext, TInput, TOutput, TError, USelectData>
    >
  ): NoInfer<U & Omit<QueryOptionsBase<TOutput, TError>, keyof U>>

  /**
   * Generate the key used for streamed options
   */
  experimental_streamedKey(
    ...rest: MaybeOptionalOptions<
      experimental_StreamedKeyOptions<TInput>
    >
  ): DataTag<QueryKey, experimental_StreamedQueryOutput<TOutput>, TError>

  /**
   * Generate [Event Iterator](https://orpc.unnoq.com/docs/event-iterator) options used for useQuery/useSuspenseQuery/prefetchQuery/...
   * Built on top of [steamedQuery](https://tanstack.com/query/latest/docs/reference/streamedQuery)
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#streamed-query-options Tanstack Streamed Query Options Utility Docs}
   */
  experimental_streamedOptions<U, USelectData = experimental_StreamedQueryOutput<TOutput>>(
    ...rest: MaybeOptionalOptions<
      U & StreamedOptionsIn<TClientContext, TInput, experimental_StreamedQueryOutput<TOutput>, TError, USelectData>
    >
  ): NoInfer<U & Omit<StreamedOptionsBase<experimental_StreamedQueryOutput<TOutput>, TError>, keyof U>>

  /**
   * Generate the key used for infinite options
   */
  infiniteKey<UPageParam>(
    options: Pick<
      InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, InfiniteData<TOutput, UPageParam>, UPageParam>,
      'input' | 'initialPageParam' | 'queryKey'
    >
  ): DataTag<QueryKey, InfiniteData<TOutput, UPageParam>, TError>

  /**
   * Generate options used for useInfiniteQuery/useSuspenseInfiniteQuery/prefetchInfiniteQuery/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#infinite-query-options Tanstack Infinite Query Options Utility Docs}
   */
  infiniteOptions<U, UPageParam, USelectData = InfiniteData<TOutput, UPageParam>>(
    options: U & InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, USelectData, UPageParam>
  ): NoInfer<U & Omit<InfiniteOptionsBase<TOutput, TError, UPageParam>, keyof U>>

  /**
   * Generate the key used for mutation options
   */
  mutationKey(
    options?: Pick<
      MutationOptionsIn<TClientContext, TInput, TOutput, TError, any>,
      'mutationKey'
    >
  ): DataTag<QueryKey, TOutput, TError>

  /**
   * Generate options used for useMutation/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#mutation-options Tanstack Mutation Options Docs}
   */
  mutationOptions<UMutationContext>(
    ...rest: MaybeOptionalOptions<
      MutationOptionsIn<TClientContext, TInput, TOutput, TError, UMutationContext>
    >
  ): NoInfer<MutationOptions<TInput, TOutput, TError, UMutationContext>>
}

export interface CreateProcedureUtilsOptions {
  path: readonly string[]
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  options: CreateProcedureUtilsOptions,
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  const utils: ProcedureUtils<TClientContext, TInput, TOutput, TError> = {
    call: client,

    queryKey(...[optionsIn = {} as any]) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, { type: 'query', input: optionsIn.input })

      return queryKey
    },

    queryOptions(...[optionsIn = {} as any]) {
      const queryKey = utils.queryKey(optionsIn)

      return {
        queryFn: ({ signal }) => {
          if (optionsIn.input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          return client(optionsIn.input, {
            signal,
            context: {
              [OPERATION_CONTEXT_SYMBOL]: {
                key: queryKey,
                type: 'query',
              },
              ...optionsIn.context,
            } satisfies OperationContext,
          })
        },
        enabled: optionsIn.input !== skipToken,
        ...optionsIn,
        queryKey,
      }
    },

    experimental_streamedKey(...[optionsIn = {} as any]) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, { type: 'streamed', input: optionsIn.input, fnOptions: optionsIn.queryFnOptions })

      return queryKey
    },

    experimental_streamedOptions(...[optionsIn = {} as any]) {
      const queryKey = utils.experimental_streamedKey(optionsIn)

      return {
        enabled: optionsIn.input !== skipToken,
        queryFn: experimental_streamedQuery({
          queryFn: async ({ signal }) => {
            if (optionsIn.input === skipToken) {
              throw new Error('queryFn should not be called with skipToken used as input')
            }

            const output = await client(optionsIn.input, {
              signal,
              context: {
                [OPERATION_CONTEXT_SYMBOL]: {
                  key: queryKey,
                  type: 'streamed',
                },
                ...optionsIn.context,
              } satisfies OperationContext,
            })

            if (!isAsyncIteratorObject(output)) {
              throw new Error('streamedQuery requires an event iterator output')
            }

            return output
          },
          ...optionsIn.queryFnOptions,
        }),
        ...optionsIn,
        queryKey,
      }
    },

    infiniteKey(optionsIn) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, {
        type: 'infinite',
        input: optionsIn.input === skipToken ? skipToken : optionsIn.input(optionsIn.initialPageParam) as any,
      })

      return queryKey as any
    },

    infiniteOptions(optionsIn) {
      const queryKey = utils.infiniteKey(optionsIn as any)

      return {
        queryFn: ({ pageParam, signal }) => {
          if (optionsIn.input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          return client(optionsIn.input(pageParam as any), {
            signal,
            context: {
              [OPERATION_CONTEXT_SYMBOL]: {
                key: queryKey,
                type: 'infinite',
              } satisfies OperationContext[typeof OPERATION_CONTEXT_SYMBOL],
              ...optionsIn.context,
            } as any,
          })
        },
        enabled: optionsIn.input !== skipToken,
        ...(optionsIn as any),
        queryKey,
      }
    },

    mutationKey(...[optionsIn = {} as any]) {
      const mutationKey = optionsIn.mutationKey ?? generateOperationKey(options.path, { type: 'mutation' })

      return mutationKey
    },

    mutationOptions(...[optionsIn = {} as any]) {
      const mutationKey = utils.mutationKey(optionsIn)

      return {
        mutationFn: input => client(input, {
          context: {
            [OPERATION_CONTEXT_SYMBOL]: {
              key: mutationKey,
              type: 'mutation',
            },
            ...optionsIn.context,
          } satisfies OperationContext,
        }),
        ...(optionsIn as any),
        mutationKey,
      }
    },
  }

  return utils
}
