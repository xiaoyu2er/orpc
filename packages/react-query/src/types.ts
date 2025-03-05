import type { ClientContext } from '@orpc/client'

export type ORPCQueryOptions<TInput, TClientContext extends ClientContext> =
  & (undefined extends TInput ? { input?: TInput } : { input: TInput })
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })

export type ORPCInfiniteOptions<TClientContext extends ClientContext, TInput, TPageParam> =
  & { input: (pageParam: TPageParam) => TInput }
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })

export type ORPCMutationOptions<TClientContext extends ClientContext> =
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
