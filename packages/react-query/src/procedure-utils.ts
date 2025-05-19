import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/react-query'
import type {
  InferStreamedOutput,
  InfiniteOptionsBase,
  InfiniteOptionsIn,
  MutationOptions,
  MutationOptionsIn,
  QueryOptionsBase,
  QueryOptionsIn,
  experimental_StreamedOptionsBase as StreamedOptionsBase,
  experimental_StreamedOptionsIn as StreamedOptionsIn,
} from './types'
import { isAsyncIteratorObject } from '@orpc/shared'
import { skipToken, experimental_streamedQuery as streamedQuery } from '@tanstack/react-query'
import { buildKey } from './key'

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

  experimental_streamedOptions<U, USelectData = InferStreamedOutput<TOutput>>(
    ...rest: MaybeOptionalOptions<
      U & StreamedOptionsIn<TClientContext, TInput, InferStreamedOutput<TOutput>, TError, USelectData>
    >
  ): NoInfer<U & Omit<StreamedOptionsBase<InferStreamedOutput<TOutput>, TError>, keyof U>>

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
    ...rest: MaybeOptionalOptions<MutationOptionsIn<TClientContext, TInput, TOutput, TError, UMutationContext>>
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

    queryOptions(...[optionsIn = {} as any]) {
      return {
        queryKey: buildKey(options.path, { type: 'query', input: optionsIn.input }),
        queryFn: ({ signal }) => {
          if (optionsIn.input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          return client(optionsIn.input, { signal, context: optionsIn.context })
        },
        enabled: optionsIn.input !== skipToken,
        ...optionsIn,
      }
    },

    experimental_streamedOptions(...[optionsIn = {} as any]) {
      return {
        enabled: optionsIn.input !== skipToken,
        queryKey: buildKey(options.path, { type: 'streamed', input: optionsIn.input }),
        queryFn: streamedQuery({
          refetchMode: optionsIn.refetchMode,
          queryFn: async ({ signal }) => {
            if (optionsIn.input === skipToken) {
              throw new Error('queryFn should not be called with skipToken used as input')
            }

            const output = await client(optionsIn.input, { signal, context: optionsIn.context })

            if (!isAsyncIteratorObject(output)) {
              throw new Error('streamedQuery requires an event iterator output')
            }

            return output
          },
        }),
        ...optionsIn,
      }
    },

    infiniteOptions(optionsIn) {
      return {
        queryKey: buildKey(options.path, {
          type: 'infinite',
          input: optionsIn.input === skipToken ? skipToken : optionsIn.input(optionsIn.initialPageParam) as any,
        }),
        queryFn: ({ pageParam, signal }) => {
          if (optionsIn.input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          return client(optionsIn.input(pageParam as any), { signal, context: optionsIn.context as any })
        },
        enabled: optionsIn.input !== skipToken,
        ...(optionsIn as any),
      }
    },

    mutationOptions(...[optionsIn = {} as any]) {
      return {
        mutationKey: buildKey(options.path, { type: 'mutation' }),
        mutationFn: input => client(input, { context: optionsIn.context }),
        ...(optionsIn as any),
      }
    },
  }
}
