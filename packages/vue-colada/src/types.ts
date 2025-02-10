import type { ClientContext } from '@orpc/contract'
import type { AnyFunction, SetOptional } from '@orpc/shared'
import type { UseMutationOptions, UseQueryOptions } from '@pinia/colada'
import type { MaybeRef } from 'vue'

export type MaybeRefDeep<T> = MaybeRef<
  T extends AnyFunction
    ? T
    : T extends object
      ? { [K in keyof T]: MaybeRefDeep<T[K]> }
      : T
>

export type UseQueryFnContext = Parameters<UseQueryOptions<any>['query']>[0]

export type QueryOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError extends Error> =
  & (undefined extends TInput ? { input?: MaybeRefDeep<TInput> } : { input: MaybeRefDeep<TInput> })
  & (Record<never, never> extends TClientContext ? { context?: MaybeRefDeep<TClientContext> } : { context: MaybeRefDeep<TClientContext> })
  & SetOptional<UseQueryOptions<TOutput, TError>, 'key' | 'query'>

export type QueryOptions<TOutput, TError extends Error> = UseQueryOptions<TOutput, TError>

export type MutationOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError extends Error> =
  & (Record<never, never> extends TClientContext ? { context?: MaybeRefDeep<TClientContext> } : { context: MaybeRefDeep<TClientContext> })
  & SetOptional<UseMutationOptions<TOutput, TInput, TError>, 'mutation'>

export type MutationOptions<TInput, TOutput, TError extends Error> = UseMutationOptions<TOutput, TInput, TError>
