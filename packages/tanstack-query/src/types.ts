import type { ClientContext } from '@orpc/client'
import type { PartialDeep, SetOptional } from '@orpc/shared'
import type {
  experimental_streamedQuery,
  InfiniteQueryObserverOptions,
  MutationObserverOptions,
  QueryFunctionContext,
  QueryKey,
  QueryObserverOptions,
  SkipToken,
} from '@tanstack/query-core'

export type experimental_StreamedQueryOutput<TOutput> = TOutput extends AsyncIterable<infer U> ? U[] : never

type experimental_StreamedQueryOptions = Omit<Parameters<typeof experimental_streamedQuery>[0], 'queryFn'>

export type OperationType = 'query' | 'streamed' | 'infinite' | 'mutation'

export type OperationKeyOptions<TType extends OperationType, TInput> = {
  type?: TType
  input?: TType extends 'mutation' ? never : PartialDeep<TInput>
  fnOptions?: TType extends 'streamed' ? experimental_StreamedQueryOptions : never
}

export type OperationKey<TType extends OperationType, TInput> = [path: readonly string[], options: OperationKeyOptions<TType, TInput>]

export type QueryOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData> =
    & (undefined extends TInput ? { input?: TInput | SkipToken } : { input: TInput | SkipToken })
    & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
    & SetOptional<QueryObserverOptions<TOutput, TError, TSelectData>, 'queryKey'>

export interface QueryOptionsBase<TOutput, TError> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext): Promise<TOutput>
  throwOnError?(error: TError): boolean // Help TQ infer TError
  enabled: boolean
}

export type experimental_StreamedOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData> =
  & QueryOptionsIn<TClientContext, TInput, TOutput, TError, TSelectData>
  & { queryFnOptions?: experimental_StreamedQueryOptions }

export interface experimental_StreamedOptionsBase<TOutput, TError> extends QueryOptionsBase<TOutput, TError> {
}

export type InfiniteOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData, TPageParam> =
  & { input: ((pageParam: TPageParam) => TInput) | SkipToken }
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & SetOptional<InfiniteQueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>, 'queryKey'>

export interface InfiniteOptionsBase<TOutput, TError, TPageParam> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext<QueryKey, TPageParam>): Promise<TOutput>
  throwOnError?(error: TError): boolean // Help TQ infer TError
  enabled: boolean
}

export type MutationOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TMutationContext> =
    & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
    & MutationObserverOptions<TOutput, TError, TInput, TMutationContext>

export type MutationOptionsBase<TInput, TOutput, TError, TMutationContext> = {
  mutationKey: QueryKey
  mutationFn: (variables: TInput) => Promise<TOutput>
  onError?(error: TError, variables: TInput, context: TMutationContext | undefined): void // Help TQ infer TError and TMutationContext
}
