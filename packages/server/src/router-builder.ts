import type { HTTPPath } from '@orpc/contract'
import type { MapInputMiddleware, Middleware } from './middleware'
import { DecoratedProcedure, isProcedure } from './procedure'
import type { Router } from './router'
import type { Context, MergeContext } from './types'

export class RouterBuilder<
  TContext extends Context,
  TExtraContext extends Context,
> {
  constructor(
    public zzRouterBuilder: {
      prefix?: HTTPPath
      middlewares?: Middleware<TContext, any, any, any>[]
    },
  ) {}

  prefix(prefix: HTTPPath) {
    return new RouterBuilder({
      ...this.zzRouterBuilder,
      prefix: `${this.zzRouterBuilder.prefix ?? ''}${prefix}`,
    })
  }

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      unknown,
      unknown
    >,
  ): RouterBuilder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      unknown
    >,
    mapInput: MapInputMiddleware<unknown, UMappedInput>,
  ): RouterBuilder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use(
    middleware_: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): RouterBuilder<any, any> {
    const middleware: Middleware<any, any, any, any> =
      typeof mapInput === 'function'
        ? (input, ...rest) => middleware(mapInput(input), ...rest)
        : middleware_

    return new RouterBuilder({
      ...this.zzRouterBuilder,
      middlewares: [...(this.zzRouterBuilder.middlewares || []), middleware],
    })
  }

  router<URouter extends Router<TContext>>(router: URouter): URouter {
    if (!this.zzRouterBuilder.prefix && !this.zzRouterBuilder.middlewares) {
      return router
    }

    const clone: Router<TContext> = {}

    for (const key in router) {
      const item = router[key]

      if (isProcedure(item)) {
        const builderMiddlewares = this.zzRouterBuilder.middlewares ?? []
        const itemMiddlewares = item.zzProcedure.middlewares ?? []

        const middlewares = [
          ...builderMiddlewares,
          ...itemMiddlewares.filter(
            (item) => !builderMiddlewares.includes(item),
          ),
        ]

        clone[key] = new DecoratedProcedure({
          ...item.zzProcedure,
          contract: this.zzRouterBuilder.prefix
            ? item.zzProcedure.contract.prefix(this.zzRouterBuilder.prefix)
            : item.zzProcedure.contract,
          middlewares,
        })
      } else {
        clone[key] = this.router(item as any)
      }
    }

    return clone as URouter
  }
}
