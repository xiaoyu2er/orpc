import type { ClientContext } from '@orpc/contract'
import type { AnyFunction, SetOptional } from '@orpc/shared'
import type { Enabled, MutationObserverOptions, QueryFunctionContext, QueryKey, QueryObserverOptions, UseInfiniteQueryOptions } from '@tanstack/vue-query'
import type { ComputedRef, MaybeRef, MaybeRefOrGetter } from 'vue'

/**
 * Since `@tanstack/vue-query` is not exporting the type `MaybeRefDeep` we need to copy it from the source code.
 * https://github.com/TanStack/query/blob/7ff544e12e79388e513b1cd886aeb946f80f0153/packages/vue-query/src/types.ts#L19C1-L27C2
 */
export type MaybeRefDeep<T> = MaybeRef<
  T extends AnyFunction
    ? T
    : T extends object
      ? { [Property in keyof T]: MaybeRefDeep<T[Property]> }
      : T
>

export type QueryOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: MaybeRefDeep<TInput> } : { input: MaybeRefDeep<TInput> })
  & (Record<never, never> extends TClientContext ? { context?: MaybeRefDeep<TClientContext> } : { context: MaybeRefDeep<TClientContext> })
  & {
    [P in keyof Omit<QueryObserverOptions<TOutput, TError, TSelectData, TOutput>, 'queryKey' | 'enabled'>]:
    MaybeRefDeep<QueryObserverOptions<TOutput, TError, TSelectData, TOutput>[P]>
  }
  & {
    enabled?: MaybeRefOrGetter<Enabled<TOutput, TError, TSelectData>>
    queryKey?: MaybeRefDeep<QueryKey>
    shallow?: boolean
  }

export interface QueryOptionsBase<TOutput, TError extends Error> {
  queryKey: ComputedRef<QueryKey>
  queryFn(ctx: QueryFunctionContext): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this help tanstack can infer TError
}

export type InfiniteOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError extends Error, TSelectData, TPageParam> =
  & { input: (pageParam: TPageParam) => MaybeRefDeep<TInput> }
  & (Record<never, never> extends TClientContext ? { context?: MaybeRefDeep<TClientContext> } : { context: MaybeRefDeep<TClientContext> })
  & SetOptional<UseInfiniteQueryOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>, 'queryKey'>

export interface InfiniteOptionsBase<TOutput, TError extends Error, TPageParam> {
  queryKey: ComputedRef<QueryKey>
  queryFn(ctx: QueryFunctionContext<QueryKey, TPageParam>): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this help tanstack can infer TError
}

export type MutationOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError extends Error> =
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & {
    [P in keyof MutationObserverOptions<TOutput, TError, TInput>]: MaybeRefDeep<MutationObserverOptions<TOutput, TError, TInput>[P]>
  }
  & {
    shallow?: MaybeRef<boolean>
  }

export interface MutationOptionsBase<TInput, TOutput, TError extends Error> {
  mutationKey: QueryKey
  mutationFn(input: TInput): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this help tanstack can infer TError
}
