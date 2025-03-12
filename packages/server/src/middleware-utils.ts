import type { AnyMiddleware } from './middleware'

export function dedupeMiddlewares(compare: readonly AnyMiddleware[], middlewares: readonly AnyMiddleware[]): AnyMiddleware[] {
  let min = 0

  for (let i = 0; i < middlewares.length; i++) {
    const index = compare.indexOf(middlewares[i]!, min)

    if (index === -1) {
      return middlewares.slice(i)
    }

    min = index + 1
  }

  return []
}

export function mergeMiddlewares(first: readonly AnyMiddleware[], second: readonly AnyMiddleware[]): AnyMiddleware[] {
  return [...first, ...dedupeMiddlewares(first, second)]
}

export function addMiddleware(middlewares: readonly AnyMiddleware[], addition: AnyMiddleware): AnyMiddleware[] {
  return [...middlewares, addition]
}
