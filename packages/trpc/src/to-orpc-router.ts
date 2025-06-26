import type * as ORPC from '@orpc/server'
import type { AnyProcedure, AnyRouter, inferRouterContext } from '@trpc/server'
import type { inferRouterMeta, Procedure, Router } from '@trpc/server/unstable-core-do-not-import'

export type ToORPCRouterResult<TContext extends ORPC.Context, TMeta extends ORPC.Meta, TRecord extends Record<string, any>>
    = {
          [K in keyof TRecord]: ORPC.Lazyable<
            TRecord[K] extends AnyProcedure
              ? ORPC.Procedure<
                TContext,
                object,
                ORPC.Schema<TRecord[K]['_def']['$types']['input'], unknown>,
                ORPC.Schema<unknown, TRecord[K]['_def']['$types']['output']>,
                object,
                TMeta
              >
              : TRecord[K] extends Record<string, any>
                ? ToORPCRouterResult<TContext, TMeta, TRecord[K]>
                : never
          >
        }

export function experimental_toORPCRouter<T extends AnyRouter>(
    router: T
): ToORPCRouterResult<
    inferRouterContext<T>,
    inferRouterMeta<T>,
    T['_def']['record']
> {
  return {} as any
}
