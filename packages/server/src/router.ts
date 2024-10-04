import {
  type ContractProcedure,
  type ContractRouter,
  type DecoratedContractRouter,
  type HTTPPath,
  createCallableObject,
  isContractProcedure,
} from '@orpc/contract'
import { isPrimitive } from 'radash'
import { type Procedure, isProcedure } from './procedure'
import type { Context } from './types'

export type Router<
  TContext extends Context,
  TContract extends ContractRouter<any>,
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
  prefix(prefix: HTTPPath): DecoratedRouter<TRouter>
}

export function decorateRouter<TRouter extends Router<any, any>>(
  router: TRouter,
): DecoratedRouter<TRouter> {
  return new Proxy(router, {
    get(target, prop) {
      const item = Reflect.get(target, prop)

      if (prop === 'prefix') {
        const prefix = (prefix: HTTPPath) => {
          const applyPrefix = (router: ContractRouter<any>) => {
            const clone: Record<
              string,
              ContractProcedure<any, any> | ContractRouter<any>
            > = {}

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
        }

        if (isPrimitive(item)) {
          return prefix
        }

        return createCallableObject(item, prefix)
      }

      return item
    },
  }) as DecoratedRouter<TRouter>
}

export function toContractRouter(
  router: Router<any, any> | ContractRouter<any>,
): ContractRouter<any> {
  const contract: ContractRouter<any> = {}

  for (const key in router) {
    const item = router[key]

    if (isContractProcedure(item)) {
      contract[key] = item
    } else if (isProcedure(item)) {
      contract[key] = item.__p.contract
    } else {
      contract[key] = toContractRouter(item as any)
    }
  }

  return contract
}
