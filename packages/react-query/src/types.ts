import type { QueryKey, UseMutationOptions, UseSuspenseInfiniteQueryOptions, UseSuspenseQueryOptions } from '@tanstack/react-query'

export type InQueryOptions<TClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: TInput } : { input: TInput })
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & Omit<OutQueryOptions<TOutput, TError, TSelectData>, 'queryKey' | 'queryFn'>

export type OutQueryOptions<TOutput, TError, TSelectData> = UseSuspenseQueryOptions<TOutput, TError, TSelectData>

export type InInfiniteOptions<TClientContext, TInput, TOutput, TError extends Error, TSelectData, TPageParam> =
  & { input: (pageParam: TPageParam) => TInput }
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & Omit<OutInfiniteOptions<TOutput, TError, TSelectData, TPageParam>, 'queryKey' | 'queryFn'>

export type OutInfiniteOptions<TOutput, TError extends Error, TSelectData, TPageParam> =
  UseSuspenseInfiniteQueryOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>

export type InMutationOptions<TClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & Omit<OutMutationOptions<TInput, TOutput, TError>, 'mutationKey' | 'mutationFn'>

export type OutMutationOptions<TInput, TOutput, TError extends Error> = UseMutationOptions<TOutput, TError, TInput>
