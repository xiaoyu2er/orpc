import { DecoratedContractProcedure, type HTTPPath } from '@orpc/contract'
import {
  type MapInputMiddleware,
  type Middleware,
  decorateMiddleware,
} from './middleware'
import { DecoratedProcedure, isProcedure } from './procedure'
import type { HandledRouter, Router } from './router'
import type { Context, MergeContext } from './types'

export class RouterBuilder<
  TContext extends Context,
  TExtraContext extends Context,
> {
  constructor(
    public zz$rb: {
      prefix?: HTTPPath
      middlewares?: Middleware<any, any, any, any>[]
    },
  ) {}

  prefix(prefix: HTTPPath) {
    return new RouterBuilder({
      ...this.zz$rb,
      prefix: `${this.zz$rb.prefix ?? ''}${prefix}`,
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
    middleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): RouterBuilder<any, any> {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new RouterBuilder({
      ...this.zz$rb,
      middlewares: [...(this.zz$rb.middlewares || []), middleware_],
    })
  }

  router<URouter extends Router<TContext>>(
    router: URouter,
  ): HandledRouter<URouter> {
    const handled: Router<TContext> = {}

    for (const key in router) {
      const item = router[key]

      if (isProcedure(item)) {
        const builderMiddlewares = this.zz$rb.middlewares ?? []
        const itemMiddlewares = item.zz$p.middlewares ?? []

        const middlewares = [
          ...builderMiddlewares,
          ...itemMiddlewares.filter(
            (item) => !builderMiddlewares.includes(item),
          ),
        ]

        handled[key] = new DecoratedProcedure({
          ...item.zz$p,
          contract: this.zz$rb.prefix
            ? DecoratedContractProcedure.decorate(item.zz$p.contract).prefix(
                this.zz$rb.prefix,
              )
            : item.zz$p.contract,
          middlewares,
        })
      } else {
        handled[key] = this.router(item as any)
      }
    }

    return handled as HandledRouter<URouter>
  }
}
