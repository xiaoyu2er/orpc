export const LAZY_LOADER_SYMBOL: unique symbol = Symbol('ORPC_LAZY_LOADER')

export interface Lazy<T> {
  [LAZY_LOADER_SYMBOL]: () => Promise<{ default: T }>
}

export type Lazyable<T> = T | Lazy<T>

export type ANY_LAZY = Lazy<any>

export function lazy<T>(loader: () => Promise<{ default: T }>): Lazy<T> {
  return {
    [LAZY_LOADER_SYMBOL]: loader,
  }
}

export function isLazy(item: unknown): item is ANY_LAZY {
  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && LAZY_LOADER_SYMBOL in item
    && typeof item[LAZY_LOADER_SYMBOL] === 'function'
  )
}

export function unwrapLazy<T extends Lazy<any>>(lazy: T): Promise<{ default: T extends Lazy<infer U> ? U : never }> {
  return lazy[LAZY_LOADER_SYMBOL]() as any
}

export type FlattenLazy<T> = T extends Lazy<infer U>
  ? FlattenLazy<U>
  : Lazy<T>

export function flatLazy<T extends ANY_LAZY>(lazied: T): FlattenLazy<T> {
  const flattenLoader = async () => {
    let current = await unwrapLazy(lazied)

    while (true) {
      if (!isLazy(current.default)) {
        break
      }

      current = await unwrapLazy(current.default)
    }

    return current
  }

  return lazy(flattenLoader) as any
}
