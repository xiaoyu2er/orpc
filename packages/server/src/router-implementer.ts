import {
  type ContractProcedure,
  type ContractRouter,
  type DecoratedContractProcedure,
  isContractProcedure,
} from '@orpc/contract'
import type { Middleware } from './middleware'
import { isProcedure } from './procedure'
import { ProcedureImplementer } from './procedure-implementer'
import type { Router, RouterWithContract } from './router'
import type { Context } from './types'

export class RouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter,
> {
  constructor(
    public zz$ri: {
      contract: TContract
    },
  ) {}

  router(
    router: RouterWithContract<TContext, TContract>,
  ): RouterWithContract<TContext, TContract> {
    assertRouterImplementation(this.zz$ri.contract, router)

    return router
  }
}

export type ChainedRouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter,
  TExtraContext extends Context,
> = {
  [K in keyof TContract]: TContract[K] extends ContractProcedure<any, any>
    ? ProcedureImplementer<TContext, TContract[K], TExtraContext>
    : TContract[K] extends ContractRouter
      ? ChainedRouterImplementer<TContext, TContract[K], TExtraContext>
      : never
} & RouterImplementer<TContext, TContract>

export function chainRouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter,
  TExtraContext extends Context,
>(
  contract: TContract,
  middlewares?: Middleware<any, any, any, any>[],
): ChainedRouterImplementer<TContext, TContract, TExtraContext> {
  return new Proxy(new RouterImplementer({ contract }), {
    get(target, prop) {
      const item = Reflect.get(target, prop)
      const itemContract = Reflect.get(contract as object, prop)
      if (itemContract === undefined) return item

      /* v8 ignore next 5 */
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

      /* v8 ignore next 5 */
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

export function assertRouterImplementation(
  contract: ContractRouter,
  router: RouterWithContract<any, any>,
  path: string[] = [],
): void {
  for (const key in contract) {
    const currentPath = [...path, key]
    const contractItem = contract[key]
    const routerItem = router[key] as any

    if (!routerItem) {
      throw new Error(
        `Missing implementation for procedure at [${currentPath.join('.')}]`,
      )
    }

    if (isContractProcedure(contractItem)) {
      if (isProcedure(routerItem)) {
        if (routerItem.zz$p.contract !== contractItem) {
          throw new Error(
            `Mismatch implementation for procedure at [${currentPath.join('.')}]`,
          )
        }
      } else {
        throw new Error(
          `Mismatch implementation for procedure at [${currentPath.join('.')}]`,
        )
      }
    } else {
      assertRouterImplementation(
        contractItem as ContractRouter,
        routerItem,
        currentPath,
      )
    }
  }
}
