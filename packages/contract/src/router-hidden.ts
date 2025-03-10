import type { AnyContractRouter, Lazyable } from '@orpc/contract'

const HIDDEN_ROUTER_CONTRACT_SYMBOL = Symbol('ORPC_HIDDEN_ROUTER_CONTRACT')

export function setHiddenRouterContract<T extends object>(obj: T, contract: Lazyable<AnyContractRouter>): T {
  return new Proxy(obj, {
    get(target, key) {
      if (key === HIDDEN_ROUTER_CONTRACT_SYMBOL) {
        return contract
      }

      return Reflect.get(target, key)
    },
  })
}

export function getHiddenRouterContract(obj: object): Lazyable<AnyContractRouter> | undefined {
  return (obj as any)[HIDDEN_ROUTER_CONTRACT_SYMBOL]
}
