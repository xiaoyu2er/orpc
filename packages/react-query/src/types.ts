import type { QueryKey, SkipToken, UseInfiniteQueryOptions, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'

export type InQueryOptions<TClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: TInput } : { input: TInput })
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & Omit<OutQueryOptions<TOutput, TError, TSelectData>, 'queryKey' | 'queryFn'>

export interface OutQueryOptions<TOutput, TError, TSelectData> extends UseQueryOptions<TOutput, TError, TSelectData> {
  queryFn?: Exclude<UseQueryOptions<TOutput, TError, TSelectData>['queryFn'], SkipToken>
}

export type InInfiniteOptions<TClientContext, TInput, TOutput, TError extends Error, TSelectData, TPageParam> =
  & { input: (pageParam: TPageParam) => TInput }
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & Omit<OutInfiniteOptions<TOutput, TError, TSelectData, TPageParam>, 'queryKey' | 'queryFn'>

export interface OutInfiniteOptions<TOutput, TError extends Error, TSelectData, TPageParam> extends UseInfiniteQueryOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam> {
  queryFn?: Exclude<UseInfiniteQueryOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>['queryFn'], SkipToken>
}

export type InMutationOptions<TClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & Omit<OutMutationOptions<TInput, TOutput, TError>, 'mutationKey' | 'mutationFn'>

export interface OutMutationOptions<TInput, TOutput, TError extends Error> extends UseMutationOptions<TOutput, TError, TInput> {}
