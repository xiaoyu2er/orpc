import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/solid-query'
import type { InfiniteOptionsBase, InfiniteOptionsIn, MutationOptions, MutationOptionsIn, QueryOptionsBase, QueryOptionsIn } from './types'
import { buildKey } from './key'

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

export interface CreateProcedureUtilsOptions {
  path: string[]
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError extends Error>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  options: CreateProcedureUtilsOptions,
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    call: client,

    queryOptions(...[optionsIn = {} as any]) {
      return {
        queryKey: buildKey(options.path, { type: 'query', input: optionsIn.input }),
        queryFn: ({ signal }) => client(optionsIn.input, { signal, context: optionsIn.context }),
        ...optionsIn,
      }
    },

    infiniteOptions(optionsIn) {
      return {
        queryKey: buildKey(options.path, { type: 'infinite', input: optionsIn.input(optionsIn.initialPageParam) as any }),
        queryFn: ({ pageParam, signal }) => {
          return client(optionsIn.input(pageParam as any), { signal, context: optionsIn.context as any })
        },
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
