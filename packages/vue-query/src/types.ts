import type { AnyFunction } from '@orpc/shared'
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

export type QueryOptionsIn<TClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: MaybeDeepRef<TInput> } : { input: MaybeDeepRef<TInput> })
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & {
    [P in keyof Omit<QueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey>, 'queryKey'>]: P extends 'enabled'
      ? MaybeRefOrGetter<QueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey>[P]>
      : MaybeDeepRef<QueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey>[P]>
  }
  & {
    queryKey?: MaybeDeepRef<QueryKey>
    shallow?: boolean
  }

export interface QueryOptionsBase<TOutput, TError extends Error> {
  queryKey: ComputedRef<QueryKey>
  queryFn(ctx: QueryFunctionContext): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this help tanstack can infer TError
}

export type InfiniteOptionsIn<TClientContext, TInput, TOutput, TError extends Error, TSelectData, TPageParam> =
  & { input: (pageParam: TPageParam) => MaybeDeepRef<TInput> }
  & (undefined extends TClientContext ? { context?: MaybeDeepRef<TClientContext> } : { context: MaybeDeepRef<TClientContext> })
  & Omit<UseInfiniteQueryOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>, 'queryKey'>
  & {
    queryKey?: MaybeDeepRef<QueryKey>
  }

export interface InfiniteOptionsBase<TOutput, TError extends Error, TPageParam> {
  queryKey: ComputedRef<QueryKey>
  queryFn(ctx: QueryFunctionContext<QueryKey, TPageParam>): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this help tanstack can infer TError
}

export type MutationOptionsIn<TClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & {
    [P in keyof MutationObserverOptions<TOutput, TError, TInput>]: MaybeDeepRef<MutationObserverOptions<TOutput, TError, TInput>[P]>
  }
  & {
    shallow?: MaybeRef<boolean>
  }

export interface MutationOptionsBase<TInput, TOutput, TError extends Error> {
  mutationKey: QueryKey
  mutationFn(input: TInput): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this help tanstack can infer TError
}
