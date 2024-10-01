import {
  type ContractProcedure,
  type WELL_DEFINED_CONTRACT_PROCEDURE,
  isContractProcedure,
} from './procedure'
import type { HTTPPath, PrefixHTTPPath } from './types'

export type ContractRouter<
  T extends Record<
    string,
    ContractProcedure<any, any, any, any> | ContractRouter<any>
  >,
> = T

export type DecoratedContractRouter<TRouter extends ContractRouter<any>> =
  TRouter & {
    prefix<TPrefix extends Exclude<HTTPPath, undefined>>(
      prefix: TPrefix,
    ): DecoratedContractRouter<PrefixContractRouter<TRouter, TPrefix>>
  }

export function decorateContractRouter<TRouter extends ContractRouter<any>>(
  router: TRouter,
): DecoratedContractRouter<TRouter> {
  const extendedRouter = new Proxy(router as object, {
    get(rootTarget, prop) {
      if (prop === 'prefix') {
        return Object.assign((prefix: Exclude<HTTPPath, undefined>) => {
          const applyPrefix = (router: ContractRouter<any>) => {
            const clone: Record<
              string,
              ContractProcedure<any, any, any, any> | ContractRouter<any>
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
        }, Reflect.get(rootTarget, prop) ?? {})
      }

      return Reflect.get(rootTarget, prop)
    },
  })

  return extendedRouter as any
}

export type PrefixContractRouter<
  TRouter extends ContractRouter<any>,
  TPrefix extends Exclude<HTTPPath, undefined>,
> = {
  [K in keyof TRouter]: TRouter[K] extends ContractProcedure<
    infer TInputSchema,
    infer TOutputSchema,
    infer TMethod,
    infer TPath
  >
    ? ContractProcedure<
        TInputSchema,
        TOutputSchema,
        TMethod,
        PrefixHTTPPath<TPrefix, TPath>
      >
    : PrefixContractRouter<TRouter[K], TPrefix>
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
