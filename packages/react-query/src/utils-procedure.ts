import type { PartialOnUndefinedDeep, SetOptional } from '@orpc/shared'
import type { DefaultError, InfiniteData, QueryKey, UseInfiniteQueryOptions, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import type { InferCursor } from './types'
import { buildKey } from './key'

/**
 * Utils at procedure level
 */
export interface ProcedureUtils<TInput, TOutput> {
  queryOptions: <U = TOutput>(
    options:
      & SetOptional<UseQueryOptions<TOutput, DefaultError, U, QueryKey>, 'queryFn' | 'queryKey'>
      & PartialOnUndefinedDeep<{ input: TInput }>
  ) => UseQueryOptions<TOutput, DefaultError, U, QueryKey>

  infiniteOptions: <U = InfiniteData<TOutput, InferCursor<TInput>>>(
    options:
      & SetOptional<
        PartialOnUndefinedDeep<
          UseInfiniteQueryOptions<TOutput, DefaultError, U, TOutput, QueryKey, InferCursor<TInput>>
        >,
        'queryFn' | 'queryKey'
      >
      & PartialOnUndefinedDeep<{ input: Omit<TInput, 'cursor'> }>
  ) => UseInfiniteQueryOptions<TOutput, DefaultError, U, TOutput, QueryKey, InferCursor<TInput>>

  mutationOptions: (
    options: SetOptional<UseMutationOptions<TOutput, DefaultError, TInput>, 'mutationFn' | 'mutationKey'>
  ) => UseMutationOptions<TOutput, DefaultError, TInput>
}

export function createProcedureUtils<TInput, TOutput>(
  prefix: string,
  client: (input: TInput) => Promise<TOutput>,
): ProcedureUtils<TInput, TOutput> {
  const path: string[] = [] // TODO

  return {
    queryOptions(options) {
      const input = options.input as TInput

      return {
        queryKey: buildKey(prefix, path, { type: 'query', input }),
        queryFn: () => client(input),
        ...options,
      }
    },

    infiniteOptions(options) {
      const input = options.input as Omit<TInput, 'cursor'>

      return {
        queryKey: buildKey(prefix, path, { type: 'infinite', input }),
        queryFn: ({ pageParam }) => client({ ...(input as any), cursor: pageParam }),
        ...(options as any),
      }
    },

    mutationOptions(options) {
      return {
        mutationKey: buildKey(prefix, path, { type: 'mutation' }),
        mutationFn: input => client(input),
        ...options,
      }
    },
  }
}
