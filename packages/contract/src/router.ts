import { ContractProcedure, isContractProcedure } from './procedure'
import { HTTPPath } from './types'

export type ContractRouter<
  T extends Record<string, ContractProcedure<any, any> | ContractRouter<any>>
> = T

export type DecoratedContractRouter<TRouter extends ContractRouter<any>> = TRouter & {
  prefix<TPrefix extends HTTPPath>(prefix: TPrefix): DecoratedContractRouter<TRouter>
}

export function decorateContractRouter<TRouter extends ContractRouter<any>>(
  router: TRouter
): DecoratedContractRouter<TRouter> {
  const extendedRouter = new Proxy(router as {}, {
    get(rootTarget, prop) {
      if (prop === 'prefix') {
        return Object.assign((prefix: HTTPPath) => {
          const applyPrefix = (router: ContractRouter<any>) => {
            const clone: Record<string, ContractProcedure<any, any> | ContractRouter<any>> = {}

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
        }, Reflect.get(rootTarget, prop) ?? {})
      }

      return Reflect.get(rootTarget, prop)
    },
  })

  return extendedRouter as any
}
