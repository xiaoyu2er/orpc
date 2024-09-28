import {
  ContractProcedure,
  ContractRouter,
  DecoratedContractRouter,
  HTTPPath,
} from '@orpc/contract'
import { isProcedure, Procedure } from './procedure'
import { Context } from './types'

export type Router<
  TContext extends Context,
  TContract extends ContractRouter<any>
> = TContract extends DecoratedContractRouter<infer UContract>
  ? {
      [K in keyof UContract]: UContract[K] extends ContractProcedure<any, any>
        ? Procedure<TContext, UContract[K], any, any>
        : Router<TContext, UContract[K]>
    }
  : {
      [K in keyof TContract]: TContract[K] extends ContractProcedure<any, any>
        ? Procedure<TContext, TContract[K], any, any>
        : Router<TContext, TContract[K]>
    }

export type DecoratedRouter<TRouter extends Router<any, any>> = TRouter & {
  prefix(prefix: HTTPPath): DecoratedContractRouter<TRouter>
}

export function decorateRouter<TRouter extends Router<any, any>>(
  router: TRouter
): DecoratedRouter<TRouter> {
  return new Proxy(router, {
    get(target, prop) {
      if (prop === 'prefix') {
        return Object.assign((prefix: HTTPPath) => {
          const applyPrefix = (router: ContractRouter<any>) => {
            const clone: Record<string, ContractProcedure<any, any> | ContractRouter<any>> = {}

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
