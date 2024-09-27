import { ContractProcedure, isContractProcedure } from './procedure'
import { HTTPPath } from './types'

export type ContractRouter<T extends Record<string, ContractProcedure | ContractRouter> = any> = T

export type ExtendedContractRouter<TRouter extends ContractRouter> = TRouter & {
  prefix<TPrefix extends HTTPPath>(prefix: TPrefix): ExtendedContractRouter<TRouter>
}

export function createExtendedContractRouter<TRouter extends ContractRouter>(
  router: TRouter
): ExtendedContractRouter<TRouter> {
  const extendedRouter = new Proxy(router as {}, {
    get(rootTarget, prop) {
      if (prop === 'prefix') {
        return new Proxy(
          Object.assign(() => {}, Reflect.get(rootTarget, prop) ?? {}),
          {
            apply(_target, _thisArg, [prefix]) {
              const applyPrefix = (router: ContractRouter) => {
                const clone: Record<string, ContractProcedure | ContractRouter> = {}

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

              return createExtendedContractRouter(clone)
            },
          }
        )
      }

      return Reflect.get(rootTarget, prop)
    },
  })

  return extendedRouter as any
}
