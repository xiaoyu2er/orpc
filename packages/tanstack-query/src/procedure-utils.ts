import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/query-core'
import type {
  experimental_StreamedQueryOutput,
  InfiniteOptionsBase,
  InfiniteOptionsIn,
  MutationOptions,
  MutationOptionsIn,
  OperationContext,
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
   * @see {@link https://orpc.unnoq.com/docs/tanstack-query/basic#calling-procedure-clients Tanstack Calling Procedure Client Docs}
   */
  call: Client<TClientContext, TInput, TOutput, TError>

  /**
   * Generate options used for useQuery/useSuspenseQuery/prefetchQuery/...
   *
   * @see {@link https://orpc.unnoq.com/docs/tanstack-query/basic#query-options-utility Tanstack Query Options Utility Docs}
   */
  queryOptions<U, USelectData = TOutput>(
    ...rest: MaybeOptionalOptions<
      U & QueryOptionsIn<TClientContext, TInput, TOutput, TError, USelectData>
    >
  ): NoInfer<U & Omit<QueryOptionsBase<TOutput, TError>, keyof U>>

  /**
   * Generate [Event Iterator](https://orpc.unnoq.com/docs/event-iterator) options used for useQuery/useSuspenseQuery/prefetchQuery/...
   * Built on top of [steamedQuery](https://tanstack.com/query/latest/docs/reference/streamedQuery)
   *
   * @see {@link https://orpc.unnoq.com/docs/tanstack-query/basic#streamed-query-options-utility Tanstack Streamed Query Options Utility Docs}
   */
  experimental_streamedOptions<U, USelectData = experimental_StreamedQueryOutput<TOutput>>(
    ...rest: MaybeOptionalOptions<
      U & StreamedOptionsIn<TClientContext, TInput, experimental_StreamedQueryOutput<TOutput>, TError, USelectData>
    >
  ): NoInfer<U & Omit<StreamedOptionsBase<experimental_StreamedQueryOutput<TOutput>, TError>, keyof U>>

  /**
   * Generate options used for useInfiniteQuery/useSuspenseInfiniteQuery/prefetchInfiniteQuery/...
   *
   * @see {@link https://orpc.unnoq.com/docs/tanstack-query/basic#infinite-query-options-utility Tanstack Infinite Query Options Utility Docs}
   */
  infiniteOptions<U, UPageParam, USelectData = InfiniteData<TOutput, UPageParam>>(
    options: U & InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, USelectData, UPageParam>
  ): NoInfer<U & Omit<InfiniteOptionsBase<TOutput, TError, UPageParam>, keyof U>>

  /**
   * Generate options used for useMutation/...
   *
   * @see {@link https://orpc.unnoq.com/docs/tanstack-query/basic#mutation-options Tanstack Mutation Options Docs}
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
  return {
    call: client,

    queryOptions(...[optionsIn = {} as any]) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, { type: 'query', input: optionsIn.input })

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

    experimental_streamedOptions(...[optionsIn = {} as any]) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, { type: 'streamed', input: optionsIn.input, fnOptions: optionsIn.queryFnOptions })

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

    infiniteOptions(optionsIn) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, {
        type: 'infinite',
        input: optionsIn.input === skipToken ? skipToken : optionsIn.input(optionsIn.initialPageParam) as any,
      })

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

    mutationOptions(...[optionsIn = {} as any]) {
      const mutationKey = optionsIn.mutationKey ?? generateOperationKey(options.path, { type: 'mutation' })

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
}
