import type { ContractRouter } from '@orpc/contract'
import type { DecoratedLazy } from './lazy-decorated'
import type { Middleware } from './middleware'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import type { Context, MergeContext } from './types'
import { RouterBuilder } from './router-builder'

export const ROUTER_CONTRACT_SYMBOL = Symbol('ORPC_ROUTER_CONTRACT')

export interface RouterImplementerDef<
  TContext extends Context,
  TExtraContext extends Context,
  TContract extends ContractRouter,
> {
  middlewares?: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any>[]
  contract: TContract
}

export class RouterImplementer<
  TContext extends Context,
  TExtraContext extends Context,
  TContract extends ContractRouter,
> {
  '~type' = 'RouterImplementer' as const
  '~orpc': RouterImplementerDef<TContext, TExtraContext, TContract>

  constructor(def: RouterImplementerDef<TContext, TExtraContext, TContract>) {
    this['~orpc'] = def
  }

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      unknown,
      unknown
    >,
  ): RouterImplementer<TContext, MergeContext<TExtraContext, U>, TContract> {
    return new RouterImplementer({
      ...this['~orpc'],
      middlewares: [...(this['~orpc'].middlewares ?? []), middleware as any],
    })
  }

  router<U extends Router<MergeContext<TContext, TExtraContext>, TContract>>(
    router: U,
  ): AdaptedRouter<TContext, U> {
    const adapted = new RouterBuilder(this['~orpc']).router(router)

    const contracted = this.attachContract(adapted)

    return contracted
  }

  lazy<U extends Router<MergeContext<TContext, TExtraContext>, TContract>>(
    loader: () => Promise<{ default: U }>,
  ): DecoratedLazy<AdaptedRouter<TContext, U>> {
    const adapted = new RouterBuilder(this['~orpc']).lazy(loader)

    const contracted = this.attachContract(adapted)

    return contracted
  }

  private attachContract<T extends object>(
    router: T,
  ): T {
    return Object.defineProperty(router, ROUTER_CONTRACT_SYMBOL, {
      value: this['~orpc'].contract,
    })
  }
}
