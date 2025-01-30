import type { HTTPPath } from '@orpc/contract'

export const LAZY_SYMBOL: unique symbol = Symbol('ORPC_LAZY')

export interface LazyMeta {
  prefix?: HTTPPath
}

export interface Lazy<T> {
  [LAZY_SYMBOL]: {
    loader(): Promise<{ default: T }>
    meta: LazyMeta
  }
}

export type Lazyable<T> = T | Lazy<T>

export interface LazyOptions {
  prefix?: HTTPPath
}

export function lazy<T>(loader: () => Promise<{ default: T }>, meta: LazyMeta = {}): Lazy<T> {
  return {
    [LAZY_SYMBOL]: {
      loader,
      meta,
    },
  }
}

export function isLazy(item: unknown): item is Lazy<any> {
  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && LAZY_SYMBOL in item
    && typeof item[LAZY_SYMBOL] === 'object'
    && item[LAZY_SYMBOL] !== null
    && 'loader' in item[LAZY_SYMBOL]
    && 'meta' in item[LAZY_SYMBOL]
  )
}

export function unlazy<T extends Lazyable<any>>(lazied: T): Promise<{ default: T extends Lazy<infer U> ? U : T }> {
  return isLazy(lazied) ? lazied[LAZY_SYMBOL].loader() : Promise.resolve({ default: lazied })
}

export function getLazyMeta(lazy: Lazy<any>): LazyMeta {
  return lazy[LAZY_SYMBOL].meta
}
