import type { AnyContractRouter, ContractRouter, HTTPPath } from '@orpc/contract'
import type { Lazy } from './lazy'
import type { AnyRouter } from './router'
import { isLazy } from './lazy'

const ROUTER_CONTRACT_SYMBOL = Symbol('ORPC_ROUTER_CONTRACT')

export function setRouterContract<T extends AnyRouter>(obj: T, contract: AnyContractRouter): T {
  return new Proxy(obj, {
    get(target, key) {
      if (key === ROUTER_CONTRACT_SYMBOL) {
        return contract
      }

      return Reflect.get(target, key)
    },
  })
}

export function getRouterContract(obj: object): ContractRouter<any> | undefined {
  return (obj as any)[ROUTER_CONTRACT_SYMBOL]
}

const LAZY_ROUTER_PREFIX_SYMBOL = Symbol('ORPC_LAZY_ROUTER_PREFIX')

export function deepSetLazyRouterPrefix<T extends Lazy<any>>(router: T, prefix: HTTPPath): T {
  return new Proxy(router, {
    get(target, key) {
      if (key !== LAZY_ROUTER_PREFIX_SYMBOL) {
        const val = Reflect.get(target, key)
        if (isLazy(val)) {
          return deepSetLazyRouterPrefix(val, prefix)
        }

        return val
      }

      return prefix
    },
  })
}

export function getLazyRouterPrefix(obj: object): HTTPPath | undefined {
  return (obj as any)[LAZY_ROUTER_PREFIX_SYMBOL]
}
