import { isPrimitive } from 'radash'
import {
  type ContractProcedure,
  type WELL_DEFINED_CONTRACT_PROCEDURE,
  isContractProcedure,
} from './procedure'
import type { HTTPPath } from './types'
import { createCallableObject } from './utils'
export type ContractRouter<
  T extends Record<string, ContractProcedure<any, any> | ContractRouter<any>>,
> = T

export type DecoratedContractRouter<TRouter extends ContractRouter<any>> =
  TRouter & {
    prefix(prefix: HTTPPath): DecoratedContractRouter<TRouter>
  }

export function decorateContractRouter<TRouter extends ContractRouter<any>>(
  router: TRouter,
): DecoratedContractRouter<TRouter> {
  const extendedRouter = new Proxy(router as object, {
    get(rootTarget, prop) {
      const item = Reflect.get(rootTarget, prop)

      if (prop === 'prefix') {
        const prefix = (prefix: HTTPPath) => {
          const applyPrefix = (router: ContractRouter<any>) => {
            const clone: Record<
              string,
              ContractProcedure<any, any> | ContractRouter<any>
            > = {}

            for (const key in router) {
              const item = router[key]

              if (isContractProcedure(item)) {
                clone[key] = item.prefix(prefix)
              } else {
                clone[key] = applyPrefix(item)
              }
            }

            return clone
          }

          const clone = applyPrefix(router)

          return decorateContractRouter(clone)
        }

        if (isPrimitive(item)) {
          return prefix
        }

        return createCallableObject(item, prefix)
      }

      return item
    },
  })

  return extendedRouter as any
}

export function eachContractRouterLeaf(
  router: ContractRouter<any>,
  callback: (item: WELL_DEFINED_CONTRACT_PROCEDURE, path: string[]) => void,
  prefix: string[] = [],
) {
  for (const key in router) {
    const item = router[key]

    if (isContractProcedure(item)) {
      callback(item, [...prefix, key])
    } else {
      eachContractRouterLeaf(item, callback, [...prefix, key])
    }
  }
}
