import type { AnyMiddleware } from './middleware'

export function mergeMiddlewares(first: readonly AnyMiddleware[], second: readonly AnyMiddleware[]): AnyMiddleware[] {
  return [...first, ...second]
}

export function addMiddleware(middlewares: readonly AnyMiddleware[], addition: AnyMiddleware): AnyMiddleware[] {
  return [...middlewares, addition]
}
