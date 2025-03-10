import type { AnyContractRouter, ContractRouter, Lazyable } from '@orpc/contract'
import type { AnyRouter } from './router'

const ROUTER_CONTRACT_SYMBOL = Symbol('ORPC_ROUTER_CONTRACT')

export function setRouterContract<T extends Lazyable<AnyRouter>>(obj: T, contract: AnyContractRouter): T {
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
