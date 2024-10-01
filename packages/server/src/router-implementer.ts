import {
  type ContractProcedure,
  type ContractRouter,
  isContractProcedure,
} from '@orpc/contract'
import type { Middleware } from './middleware'
import { ProcedureImplementer } from './procedure-implementer'
import type { Router } from './router'
import type { Context } from './types'

export class RouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter<any>,
> {
  router(router: Router<TContext, TContract>): Router<TContext, TContract> {
    return router
  }
}

export type ChainedRouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter<any>,
  TExtraContext extends Context,
> = {
  [K in keyof TContract]: TContract[K] extends ContractProcedure<
    any,
    any,
    any,
    any
  >
    ? ProcedureImplementer<TContext, TContract[K], TExtraContext>
    : ChainedRouterImplementer<TContext, TContract[K], TExtraContext>
} & RouterImplementer<TContext, TContract>

export function chainRouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter<any>,
  TExtraContext extends Context,
>(
  contract: TContract,
  middlewares?: Middleware<any, any, any, any>[],
): ChainedRouterImplementer<TContext, TContract, TExtraContext> {
  return new Proxy(new RouterImplementer(), {
    get(target, prop) {
      const item = Reflect.get(target, prop)
      const itemContract = Reflect.get(contract as object, prop)
      if (itemContract === undefined) return item

      if (typeof itemContract !== 'object') {
        throw new Error(
          'This error should not happen, please report it to the author - expected ContractRouter | ContractProcedure',
        )
      }

      const chained = (() => {
        if (isContractProcedure(itemContract)) {
          return new ProcedureImplementer({
            contract: itemContract,
            middlewares,
          })
        }

        return chainRouterImplementer(itemContract, middlewares)
      })()

      if (item === undefined) return chained

      if (typeof item !== 'function') {
        throw new Error(
          'This error should not happen, please report it to the author - RouterImplementer must only contain methods',
        )
      }

      return new Proxy(item, {
        get(_, prop) {
          return Reflect.get(chained, prop)
        },
      })
    },
  }) as any
}
