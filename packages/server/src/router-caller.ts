import type { PromisableValue } from '@orpc/shared'
import type { Router } from './router'
import { isProcedure, type Procedure } from './procedure'
import { createProcedureCaller, type ProcedureCaller } from './procedure-caller'

export interface CreateRouterCallerOptions<
  TRouter extends Router<any>,
> {
  router: TRouter

  /**
   * The context used when calling the procedure.
   */
  context: PromisableValue<
    TRouter extends Router<infer UContext> ? UContext : never
  >

  /**
   * This is helpful for logging and analytics.
   *
   * @internal
   */
  basePath?: string[]
}

export type RouterCaller<
  TRouter extends Router<any>,
> = {
  [K in keyof TRouter]: TRouter[K] extends Procedure<any, any, any, any, any>
    ? ProcedureCaller<TRouter[K]>
    : TRouter[K] extends Router<any>
      ? RouterCaller<TRouter[K]>
      : never
}

export function createRouterCaller<
  TRouter extends Router<any>,
>(
  options: CreateRouterCallerOptions<TRouter>,
): RouterCaller<TRouter> {
  const caller: Record<string, unknown> = {}

  for (const key in options.router) {
    const path = [...(options.basePath ?? []), key]
    const item = options.router[key]

    if (isProcedure(item)) {
      caller[key] = createProcedureCaller({
        procedure: item,
        context: options.context as any,
        path,
      })
    }
    else {
      caller[key] = createRouterCaller({
        router: item as any,
        context: options.context,
        basePath: path,
      })
    }
  }

  return caller as RouterCaller<TRouter>
}
