import {
  ContractProcedure,
  ContractRouter,
  DecoratedContractRouter,
  HTTPPath,
} from '@orpc/contract'
import { isProcedure, Procedure } from './procedure'
import { Context } from './types'

export type Router<
  TContext extends Context = any,
  TContract extends ContractRouter = any
> = TContract extends DecoratedContractRouter<infer UContract>
  ? {
      [K in keyof UContract]: UContract[K] extends ContractProcedure
        ? Procedure<TContext, UContract[K]>
        : Router<TContext, UContract[K]>
    }
  : {
      [K in keyof TContract]: TContract[K] extends ContractProcedure
        ? Procedure<TContext, TContract[K]>
        : Router<TContext, TContract[K]>
    }

export type DecoratedRouter<TRouter extends Router> = TRouter & {
  prefix(prefix: HTTPPath): DecoratedContractRouter<TRouter>
}

export function decorateRouter<TRouter extends Router>(router: TRouter): DecoratedRouter<TRouter> {
  return new Proxy(router, {
    get(target, prop) {
      if (prop === 'prefix') {
        return Object.assign((prefix: HTTPPath) => {
          const applyPrefix = (router: ContractRouter) => {
            const clone: Record<string, ContractProcedure | ContractRouter> = {}

            for (const key in router) {
              const item = router[key]

              if (isProcedure(item)) {
                clone[key] = item.prefix(prefix)
              } else {
                clone[key] = applyPrefix(item)
              }
            }

            return clone
          }

          const clone = applyPrefix(router)

          return decorateRouter(clone)
        }, Reflect.get(target, prop) ?? {})
      }

      return Reflect.get(target, prop)
    },
  }) as DecoratedRouter<TRouter>
}
