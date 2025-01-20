import type { ContractRouter } from '@orpc/contract'
import type { ConflictContextGuard, Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { FlattenLazy, Lazy } from './lazy'
import type { DecoratedLazy } from './lazy-decorated'
import type { Middleware } from './middleware'
import type { Procedure } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { ANY_ROUTER, Router } from './router'
import { setRouterContract } from './hidden'
import { RouterBuilder } from './router-builder'

/**
 * Diff with `AdaptedRouter` is that it now change the contract
 */
export type AdaptedRouterForContractFirst<TInitialContext extends Context, TRouter extends ANY_ROUTER> =
TRouter extends Lazy<infer U extends ANY_ROUTER>
  ? DecoratedLazy<AdaptedRouterForContractFirst<TInitialContext, U>>
  : TRouter extends Procedure<any, infer UCurrentContext, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap, infer URoute>
    ? DecoratedProcedure<TInitialContext, UCurrentContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap, URoute>
    : {
        [K in keyof TRouter]: TRouter[K] extends ANY_ROUTER ? AdaptedRouterForContractFirst<TInitialContext, TRouter[K]> : never
      }

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
  ): AdaptedRouterForContractFirst<TInitialContext, U> {
    const adapted = new RouterBuilder({
      ...this['~orpc'],
      errorMap: {},
    }).router(router)

    const contracted = setRouterContract(adapted, this['~orpc'].contract)

    /**
     * Sine we do not has .prefix or .tag so the result will be a AdaptedRouterForContractFirst
     */
    return contracted as any
  }

  lazy<U extends Router<TCurrentContext, TContract>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouterForContractFirst<TInitialContext, FlattenLazy<U>> {
    const adapted = new RouterBuilder({
      ...this['~orpc'],
      errorMap: {},
    }).lazy(loader)

    const contracted = setRouterContract(adapted, this['~orpc'].contract)

    /**
     * Sine we do not has .prefix or .tag so the result will be a AdaptedRouterForContractFirst
     */
    return contracted as any
  }
}
