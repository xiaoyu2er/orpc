import type { ClientContext } from '@orpc/client'
import type { AnyFunction } from '@orpc/shared'
import type { InfiniteQueryObserverOptions, MutationObserverOptions, QueryFunctionContext, QueryKey, QueryObserverOptions } from '@tanstack/vue-query'
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

export type QueryOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData> =
  & (undefined extends TInput ? { input?: MaybeRefDeep<TInput> } : { input: MaybeRefDeep<TInput> })
  & (Record<never, never> extends TClientContext ? { context?: MaybeRefDeep<TClientContext> } : { context: MaybeRefDeep<TClientContext> })
  & {
    [P in keyof Omit<QueryObserverOptions<TOutput, TError, TSelectData, TOutput>, 'queryKey' | 'enabled'>]:
    MaybeRefDeep<QueryObserverOptions<TOutput, TError, TSelectData, TOutput>[P]>
  }
  & {
    enabled?: MaybeRefOrGetter<QueryObserverOptions<TOutput, TError, TSelectData, TOutput>['enabled']>
    queryKey?: MaybeRefDeep<QueryObserverOptions<TOutput, TError, TSelectData, TOutput>['queryKey']>
    shallow?: boolean
  }

export interface QueryOptionsBase<TOutput, TError> {
  queryKey: ComputedRef<QueryKey>
  queryFn(ctx: QueryFunctionContext): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this help tanstack can infer TError
}

export type InfiniteOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData, TPageParam> =
  & { input: (pageParam: TPageParam) => MaybeRefDeep<TInput> }
  & (Record<never, never> extends TClientContext ? { context?: MaybeRefDeep<TClientContext> } : { context: MaybeRefDeep<TClientContext> })
  & {
    [Property in keyof Omit<InfiniteQueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>, 'queryKey' | 'enabled'>]:
    MaybeRefDeep<InfiniteQueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>[Property]>;
  }
  & {
    enabled?: MaybeRefOrGetter<InfiniteQueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>['enabled']>
    queryKey?: MaybeRefDeep<InfiniteQueryObserverOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>['queryKey']>
    shallow?: boolean
  }

export interface InfiniteOptionsBase<TOutput, TError, TPageParam> {
  queryKey: ComputedRef<QueryKey>
  queryFn(ctx: QueryFunctionContext<QueryKey, TPageParam>): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this help tanstack can infer TError
}

export type MutationOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TMutationContext> =
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & MutationOptions<TInput, TOutput, TError, TMutationContext>

export type MutationOptions<TInput, TOutput, TError, TMutationContext> =
  {
    [P in keyof MutationObserverOptions<TOutput, TError, TInput, TMutationContext>]: MaybeRefDeep<MutationObserverOptions<TOutput, TError, TInput, TMutationContext>[P]>
  } & {
    shallow?: MaybeRef<boolean>
  }
