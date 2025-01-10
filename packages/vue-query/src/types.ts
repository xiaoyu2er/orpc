import type { AnyFunction, SetOptional } from '@orpc/shared'
import type { MutationObserverOptions, QueryFunctionContext, QueryKey, QueryObserverOptions, UseInfiniteQueryOptions } from '@tanstack/vue-query'
import type { ComputedRef, MaybeRef, MaybeRefOrGetter } from 'vue'

export type MaybeDeepRef<T> = MaybeRef<
  T extends AnyFunction
    ? T
    : T extends object
      ? {
          [K in keyof T]: MaybeDeepRef<T[K]>
        }
      : T
>

export type NonUndefinedGuard<T> = T extends undefined ? never : T

export type InferCursor<T> = T extends { cursor?: any } ? T['cursor'] : never

export type QueryOptionsExtra<TClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: MaybeDeepRef<TInput> } : { input: MaybeDeepRef<TInput> })
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & SetOptional<{
    [P in keyof QueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey>]: P extends 'enabled'
      ? MaybeRefOrGetter<QueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey>[P]>
      : MaybeDeepRef<QueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey>[P]>
  }, 'queryKey'>
  & {
    shallow?: MaybeRef<boolean>
    initialData?: NonUndefinedGuard<TOutput> | (() => NonUndefinedGuard<TOutput>) | undefined
  }

export interface QueryOptionsBase<TOutput, TError extends Error> {
  queryKey: ComputedRef<QueryKey>
  queryFn: (ctx: QueryFunctionContext) => Promise<TOutput>
  retry?: (failureCount: number, error: TError) => boolean // this help tanstack can infer TError
}

export type InfiniteOptionsExtra<TClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: MaybeDeepRef<Omit<TInput, 'cursor'>> } : { input: MaybeDeepRef<Omit<TInput, 'cursor'>> })
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & SetOptional<
    UseInfiniteQueryOptions<TOutput, TError, TSelectData, TOutput, QueryKey, InferCursor<TInput>>,
    'queryKey' | (undefined extends InferCursor<TInput> ? 'initialPageParam' : never)
  >

export interface InfiniteOptionsBase<TInput, TOutput, TError extends Error> {
  queryKey: ComputedRef<QueryKey>
  queryFn: (ctx: QueryFunctionContext<QueryKey, InferCursor<TInput>>) => Promise<TOutput>
  initialPageParam: undefined
  retry?: (failureCount: number, error: TError) => boolean // this help tanstack can infer TError
}

export type MutationOptionsExtra<TClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & {
    [P in keyof MutationObserverOptions<TOutput, TError, TInput, unknown>]: MaybeDeepRef<MutationObserverOptions<TOutput, TError, TInput, unknown>[P]>
  }
  & {
    shallow?: MaybeRef<boolean>
  }

export interface MutationOptionsBase<TInput, TOutput, TError extends Error> {
  mutationKey: QueryKey
  mutationFn: (input: TInput) => Promise<TOutput>
  retry?: (failureCount: number, error: TError) => boolean // this help tanstack can infer TError
}
