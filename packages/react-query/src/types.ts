import type {
  DefaultError,
  QueryKey,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query'

export interface QueryOptions<TInput, TOutput, TSelectData> extends UseQueryOptions<TOutput, DefaultError, TSelectData, QueryKey> {
  input: TInput
}

export interface InfiniteOptions<TInput, TOutput, TSelectData, TCursor> extends UseInfiniteQueryOptions<TOutput, DefaultError, TSelectData, TOutput, QueryKey, TCursor> {
  input: TInput
}

export interface MutationOptions<TInput, TOutput> extends UseMutationOptions<TOutput, DefaultError, TInput> {
}

export type InferCursor<T> = T extends { cursor?: any } ? T['cursor'] : never
