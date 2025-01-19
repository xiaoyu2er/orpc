import type { Lazy } from './lazy'
import type { ANY_PROCEDURE } from './procedure'
import { flatLazy } from './lazy'
import { type ANY_ROUTER, getRouterChild } from './router'

export type DecoratedLazy<T> = T extends Lazy<infer U>
  ? DecoratedLazy<U>
  : Lazy<T>
    & (
      T extends ANY_PROCEDURE
        ? unknown
        : T extends ANY_ROUTER ? {
          [K in keyof T]: DecoratedLazy<T[K]>
        } : unknown
    )

export function decorateLazy<T extends Lazy<ANY_ROUTER | undefined>>(lazied: T): DecoratedLazy<T> {
  const flattenLazy = flatLazy(lazied)

  const recursive = new Proxy(flattenLazy, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getRouterChild(flattenLazy, key)

      return decorateLazy(next)
    },
  })

  return recursive as any
}
