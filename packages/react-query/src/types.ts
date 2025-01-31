import type { SetOptional } from '@orpc/shared'
import type {
  QueryFunctionContext,
  QueryKey,
  UndefinedInitialDataInfiniteOptions,
  UndefinedInitialDataOptions,
  UseMutationOptions,
} from '@tanstack/react-query'

export type InferCursor<T> = T extends { cursor?: any } ? T['cursor'] : never

export interface QueryOptionsBase<TOutput, TError extends Error> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
}

export type QueryOptionsExtra<TClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: TInput } : { input: TInput })
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & (
      SetOptional<UndefinedInitialDataOptions<TOutput, TError, TSelectData, QueryKey>, 'queryKey'>
  )

export interface InfiniteOptionsBase<TInput, TOutput, TError extends Error> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext<QueryKey, InferCursor<TInput>>): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
  initialPageParam: undefined
}

export type InfiniteOptionsExtra<TClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: Omit<TInput, 'cursor'> } : { input: Omit<TInput, 'cursor'> })
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & (
    SetOptional<
      UndefinedInitialDataInfiniteOptions<TOutput, TError, TSelectData, QueryKey, InferCursor<TInput>>,
      'queryKey' | (undefined extends InferCursor<TInput> ? 'initialPageParam' : never)
    >
  )

export interface MutationOptionsBase<TInput, TOutput, TError extends Error> {
  mutationKey: QueryKey
  mutationFn(input: TInput): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
}

export type MutationOptionsExtra<TClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & UseMutationOptions<TOutput, TError, TInput>
