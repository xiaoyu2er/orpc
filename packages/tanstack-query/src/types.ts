import type { ClientContext } from '@orpc/client'
import type { PartialDeep, SetOptional } from '@orpc/shared'
import type {
  DataTag,
  experimental_streamedQuery,
  InfiniteData,
  InfiniteQueryObserverOptions,
  MutationKey,
  MutationObserverOptions,
  QueryFunction,
  QueryKey,
  QueryObserverOptions,
  SkipToken,
} from '@tanstack/query-core'

export type experimental_StreamedQueryOutput<TOutput> = TOutput extends AsyncIterable<infer U> ? U[] : never
export type experimental_LiveQueryOutput<TOutput> = TOutput extends AsyncIterable<infer U> ? U : never

type experimental_StreamedQueryOptions = Omit<Parameters<typeof experimental_streamedQuery>[0], 'queryFn'>

export type OperationType = 'query' | 'streamed' | 'live' | 'infinite' | 'mutation'

/**
 * @todo move TClientContext to second position + remove default in next major version
 */
export type OperationKeyOptions<TType extends OperationType, TInput, TClientContext extends ClientContext = ClientContext> = {
  type?: TType
  context?: TClientContext
  fnOptions?: TType extends 'streamed' ? experimental_StreamedQueryOptions : never
  input?: TType extends 'mutation' ? never : PartialDeep<TInput>
}

/**
 * @todo move TClientContext to second position + remove default in next major version
 */
export type OperationKey<TType extends OperationType, TInput, TClientContext extends ClientContext = ClientContext> = [path: readonly string[], options: OperationKeyOptions<TType, TInput, TClientContext>]

export const OPERATION_CONTEXT_SYMBOL: unique symbol = Symbol('ORPC_OPERATION_CONTEXT')

export interface OperationContext {
  [OPERATION_CONTEXT_SYMBOL]?: {
    type: OperationType
    key: QueryKey
  }
}

/**
 * @todo move TClientContext to first position + remove default in next major version
 */
export type QueryKeyOptions<TInput, TClientContext extends ClientContext = ClientContext>
  = & (undefined extends TInput ? { input?: TInput | SkipToken } : { input: TInput | SkipToken })
    & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
    & { queryKey?: QueryKey }

export type QueryOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData>
  = & QueryKeyOptions<TInput, TClientContext>
    & Omit<QueryObserverOptions<TOutput, TError, TSelectData>, 'queryKey'>

export interface QueryOptionsBase<TOutput, TError> {
  queryKey: DataTag<QueryKey, TOutput, TError>
  queryFn: QueryFunction<TOutput>
  throwOnError?: (error: TError) => boolean // Help TQ infer TError
  retryDelay?: (count: number, error: TError) => number // Help TQ infer TError (suspense hooks)
  enabled: boolean
}

/**
 * @todo move TClientContext to first position + remove default in next major version
 */
export type experimental_StreamedKeyOptions<TInput, TClientContext extends ClientContext = ClientContext>
  = & QueryKeyOptions<TInput, TClientContext>
    & { queryFnOptions?: experimental_StreamedQueryOptions }

export type experimental_StreamedOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData>
  = & QueryOptionsIn<TClientContext, TInput, TOutput, TError, TSelectData>
    & { queryFnOptions?: experimental_StreamedQueryOptions }

export interface experimental_StreamedOptionsBase<TOutput, TError> extends QueryOptionsBase<TOutput, TError> {
}

export type InfiniteOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData, TPageParam>
  = & { input: ((pageParam: TPageParam) => TInput) | SkipToken }
    & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
    & SetOptional<InfiniteQueryObserverOptions<TOutput, TError, TSelectData, QueryKey, TPageParam>, 'queryKey'>

export interface InfiniteOptionsBase<TOutput, TError, TPageParam> {
  queryKey: DataTag<QueryKey, InfiniteData<TOutput, TPageParam>, TError>
  queryFn: QueryFunction<TOutput, QueryKey, TPageParam>
  select?(): InfiniteData<TOutput, TPageParam> // Help TQ infer TPageParam
  throwOnError?: (error: TError) => boolean // Help TQ infer TError
  retryDelay?: (count: number, error: TError) => number // Help TQ infer TError (suspense hooks)
  enabled: boolean
}

export type MutationKeyOptions<TClientContext extends ClientContext>
    = & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
      & { mutationKey?: MutationKey }

export type MutationOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TMutationContext>
    = & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
      & MutationOptions<TInput, TOutput, TError, TMutationContext>

export type MutationOptions<TInput, TOutput, TError, TMutationContext> = MutationObserverOptions<TOutput, TError, TInput, TMutationContext>
