import type { AnyMiddleware } from './middleware'

export function dedupeMiddlewares(compare: AnyMiddleware[], middlewares: AnyMiddleware[]): AnyMiddleware[] {
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

export function mergeMiddlewares(first: AnyMiddleware[], second: AnyMiddleware[]): AnyMiddleware[] {
  return [...first, ...dedupeMiddlewares(first, second)]
}

export function pushMiddlewares(middlewares: AnyMiddleware[], ...newMiddlewares: AnyMiddleware[]): AnyMiddleware[] {
  return [...middlewares, ...newMiddlewares]
}
