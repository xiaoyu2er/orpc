import type { QueryFunctionContext, QueryKey, UseInfiniteQueryOptions, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'

export type QueryOptionsIn<TClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: TInput } : { input: TInput })
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & Omit<UseQueryOptions<TOutput, TError, TSelectData>, 'queryKey'>
  & {
    queryKey?: QueryKey
  }

export interface QueryOptionsBase<TOutput, TError extends Error> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
}

export type InfiniteOptionsIn<TClientContext, TInput, TOutput, TError extends Error, TSelectData, TPageParam> =
  & { input: (pageParam: TPageParam) => TInput }
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & Omit<UseInfiniteQueryOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>, 'queryKey'>
  & {
    queryKey?: QueryKey
  }

export interface InfiniteOptionsBase<TOutput, TError extends Error, TPageParam> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext<QueryKey, TPageParam>): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
}

export type MutationOptionsIn<TClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & UseMutationOptions<TOutput, TError, TInput>

export interface MutationOptionsBase<TInput, TOutput, TError extends Error> {
  mutationKey: QueryKey
  mutationFn(input: TInput): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
}
