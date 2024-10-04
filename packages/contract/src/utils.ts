import type { HTTPPath } from './types'

export function standardizeHTTPPath(path: HTTPPath): HTTPPath {
  return `/${path.replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '')}`
}

export function prefixHTTPPath(prefix: HTTPPath, path: HTTPPath): HTTPPath {
  const prefix_ = standardizeHTTPPath(prefix)
  const path_ = standardizeHTTPPath(path)

  if (prefix_ === '/') return path_
  if (path_ === '/') return prefix_

  return `${prefix_}${path_}`
}

export function createCallableObject<
  T extends Record<string, any>,
  F extends (...args: any[]) => any,
>(object: T, fn: F): T & F {
  return new Proxy(fn, {
    get(_, prop) {
      return Reflect.get(object, prop)
    },
    ownKeys() {
      return Reflect.ownKeys(object)
    },
    getOwnPropertyDescriptor(_, prop) {
      return Reflect.getOwnPropertyDescriptor(object, prop)
    },
  }) as any
}
