import type { Lazy } from './lazy'
import type { AnyProcedure } from './procedure'
import type { AnyRouter } from './router'
import { flatLazy } from './lazy-utils'
import { getRouterChild } from './router-utils'

export type AccessibleLazyRouter<T extends AnyRouter | undefined | Lazy<AnyRouter | undefined>> =
  T extends Lazy<infer U extends AnyRouter | undefined | Lazy<AnyRouter | undefined>>
    ? AccessibleLazyRouter<U>
    : Lazy<T> & (
      T extends AnyProcedure | undefined
        ? unknown
        : {
            [K in keyof T]: T[K] extends AnyRouter ? AccessibleLazyRouter<T[K]> : never
          }
    )

export function createAccessibleLazyRouter<T extends Lazy<AnyRouter | undefined>>(lazied: T): AccessibleLazyRouter<T> {
  const flattenLazy = flatLazy(lazied)

  const recursive = new Proxy(flattenLazy, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getRouterChild(flattenLazy, key)

      return createAccessibleLazyRouter(next)
    },
  })

  return recursive as any
}
