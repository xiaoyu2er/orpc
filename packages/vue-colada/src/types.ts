import type { AnyFunction, SetOptional } from '@orpc/shared'
import type { UseMutationOptions, UseQueryOptions } from '@pinia/colada'
import type { MaybeRef } from 'vue'

export type MaybeDeepRef<T> = MaybeRef<
  T extends AnyFunction
    ? T
    : T extends object
      ? {
          [K in keyof T]: MaybeDeepRef<T[K]>
        }
      : T
>

export type UseQueryFnContext = Parameters<UseQueryOptions<any>['query']>[0]

export type InferCursor<T> = T extends { cursor?: any } ? T['cursor'] : never

export type QueryOptions<TInput, TOutput, TClientContext> =
  & (undefined extends TInput ? { input?: MaybeDeepRef<TInput> } : { input: MaybeDeepRef<TInput> })
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & SetOptional<UseQueryOptions<TOutput>, 'key' | 'query'>

export type MutationOptions<TInput, TOutput, TClientContext> =
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & SetOptional<UseMutationOptions<TOutput, TInput>, 'mutation'>
