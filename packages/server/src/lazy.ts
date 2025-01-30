import type { HTTPPath } from '@orpc/contract'

export const LAZY_LOADER_SYMBOL: unique symbol = Symbol('ORPC_LAZY_LOADER')

export interface LazyMeta {
  prefix?: HTTPPath
}

export interface Lazy<T> {
  [LAZY_LOADER_SYMBOL](): Promise<{ default: T }>
}

export type Lazyable<T> = T | Lazy<T>

export interface LazyOptions {
  prefix?: HTTPPath
}

export function lazy<T>(loader: () => Promise<{ default: T }>): Lazy<T> {
  return {
    [LAZY_LOADER_SYMBOL]: loader,
  }
}

export function isLazy(item: unknown): item is Lazy<any> {
  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && LAZY_LOADER_SYMBOL in item
    && typeof item[LAZY_LOADER_SYMBOL] === 'function'
  )
}

export function unlazy<T extends Lazyable<any>>(lazied: T): Promise<{ default: T extends Lazy<infer U> ? U : T }> {
  return isLazy(lazied) ? lazied[LAZY_LOADER_SYMBOL]() : Promise.resolve({ default: lazied })
}
