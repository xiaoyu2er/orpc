import type { ContractRouter } from '@orpc/contract'
import type { ConflictContextGuard, Context } from './context'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import { setRouterContract } from './hidden'
import { RouterBuilder } from './router-builder'

export interface RouterImplementerDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TContract extends ContractRouter<any>,
> {
  __initialContext?: { type: TInitialContext }
  __currentContext?: { type: TCurrentContext }
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
  ): AdaptedRouter<TInitialContext, U, Record<never, never>> {
    const adapted = new RouterBuilder({
      ...this['~orpc'],
      errorMap: {},
    }).router(router)

    const contracted = setRouterContract(adapted, this['~orpc'].contract)

    return contracted
  }

  lazy<U extends Router<TCurrentContext, TContract>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TInitialContext, FlattenLazy<U>, Record<never, never>> {
    const adapted = new RouterBuilder({
      ...this['~orpc'],
      errorMap: {},
    }).lazy(loader)

    const contracted = setRouterContract(adapted, this['~orpc'].contract)

    return contracted
  }
}
