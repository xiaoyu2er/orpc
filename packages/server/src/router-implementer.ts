import type { ContractRouter } from '@orpc/contract'
import type { ConflictContextGuard, Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { Middleware } from './middleware'
import type { Router } from './router'
import { flatLazy, type FlattenLazy, lazy } from './lazy'
import { type UnshiftedMiddlewaresRouter, unshiftMiddlewaresRouter } from './router-utils'

export interface RouterImplementerDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TContract extends ContractRouter<any>,
> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  middlewares: Middleware<any, any, any, any, any>[]
  contract: TContract
}

export class RouterImplementer<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TContract extends ContractRouter<any>,
> {
  '~type' = 'RouterImplementer' as const
  '~orpc': RouterImplementerDef<TInitialContext, TCurrentContext, TContract>

  constructor(def: RouterImplementerDef<TInitialContext, TCurrentContext, TContract>) {
    this['~orpc'] = def
  }

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      unknown,
      unknown,
      Record<never, never>
    >,
  ): ConflictContextGuard<TCurrentContext & U>
    & RouterImplementer<TInitialContext, TCurrentContext & U, TContract> {
    const builder = new RouterImplementer<TInitialContext, TCurrentContext & U, TContract>({
      contract: this['~orpc'].contract,
      middlewares: [...this['~orpc'].middlewares, middleware],
    })

    return builder as typeof builder & ConflictContextGuard<TCurrentContext & U>
  }

  router<U extends Router<TCurrentContext, TContract>>(
    router: U,
  ): UnshiftedMiddlewaresRouter<U, TInitialContext> {
    return unshiftMiddlewaresRouter(router, this['~orpc'])
  }

  lazy<U extends Router<TCurrentContext, TContract>>(
    loader: () => Promise<{ default: U }>,
  ): UnshiftedMiddlewaresRouter<FlattenLazy<U>, TInitialContext> {
    return unshiftMiddlewaresRouter(flatLazy(lazy(loader)), this['~orpc'])
  }
}
