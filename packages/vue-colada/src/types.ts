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

export type QueryOptionsExtra<TClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TInput ? { input?: MaybeDeepRef<TInput> } : { input: MaybeDeepRef<TInput> })
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & SetOptional<UseQueryOptions<TOutput, TError>, 'key' | 'query'>

export type QueryOptions<TOutput, TError extends Error> = UseQueryOptions<TOutput, TError>

export type MutationOptionsExtra<TClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & SetOptional<UseMutationOptions<TOutput, TInput, TError>, 'mutation'>

export type MutationOptions<TInput, TOutput, TError extends Error> = UseMutationOptions<TOutput, TInput, TError>
