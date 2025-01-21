import type { HTTPPath, Route } from './route'

/**
 * Since `undefined` has a specific meaning (it use default value),
 * we ensure all additional properties in each item of the ErrorMap are explicitly set to `undefined`.
 */
export type StrictRoute<T extends Route> = T & Partial<Record<Exclude<keyof Route, keyof T>, undefined>>

export function createStrictRoute<T extends Route>(route: T): StrictRoute<T> {
  return route as any // strict only for types
}

export type MergedRoute<A extends Route, B extends Route> = Omit<A, keyof B> & B

export function mergeRoute<A extends Route, B extends Route>(a: A, b: B): MergedRoute<A, B> {
  return { ...a, ...b }
}

export type PrefixedRoute<TRoute extends Route, TPrefix extends HTTPPath> =
    TRoute['path'] extends HTTPPath ? Omit<TRoute, 'path'> & {
      // I don't know why but we need recheck TPrefix here to make typescript happy on [DecoratedContractProcedure.prefix]
      path: TPrefix extends HTTPPath ? `${TPrefix}${TRoute['path']}` : TRoute['path']
    }
      : TRoute

export function prefixRoute<TRoute extends Route, TPrefix extends HTTPPath>(
  route: TRoute,
  prefix: TPrefix,
): PrefixedRoute<TRoute, TPrefix> {
  if (!route.path) {
    return route as any
  }

  return {
    ...route,
    path: `${prefix}${route.path}` as any,
  }
}

export type UnshiftedTagRoute<TRoute extends Route, TTags extends readonly string[]> = Omit<TRoute, 'tags'> & {
  tags: TRoute['tags'] extends string[] ? [...TTags, ...TRoute['tags']] : TTags
}

export function unshiftTagRoute<TRoute extends Route, TTags extends readonly string[]>(
  route: TRoute,
  tags: TTags,
): UnshiftedTagRoute<TRoute, TTags> {
  return {
    ...route,
    tags: [...tags, ...route.tags ?? []] as any,
  }
}

export type MergedPrefix<A extends HTTPPath | undefined, B extends HTTPPath> = A extends HTTPPath ? `${A}${B}` : B

export function mergePrefix<A extends HTTPPath | undefined, B extends HTTPPath>(a: A, b: B): MergedPrefix<A, B> {
  return a ? `${a}${b}` : b as any
}

export type MergedTags<A extends readonly string[] | undefined, B extends readonly string[]> = A extends readonly string[] ? [...A, ...B] : B

export function mergeTags<A extends readonly string[] | undefined, B extends readonly string[]>(a: A, b: B): MergedTags<A, B> {
  return a ? [...a, ...b] : b as any
}

export type AdaptedRoute<TRoute extends Route, TPrefix extends HTTPPath | undefined, TTags extends readonly string[] | undefined> =
    TPrefix extends HTTPPath
      ? PrefixedRoute<TTags extends readonly string[] ? UnshiftedTagRoute<TRoute, TTags> : TRoute, TPrefix>
      : TTags extends readonly string[]
        ? UnshiftedTagRoute<TRoute, TTags>
        : TRoute

export function adaptRoute<
  TRoute extends Route,
  TPrefix extends HTTPPath | undefined,
  TTags extends readonly string[] | undefined,
>(
  route: TRoute,
  prefix: TPrefix,
  tags: TTags,
): AdaptedRoute<TRoute, TPrefix, TTags> {
  let router = route as any

  if (prefix) {
    router = prefixRoute(router, prefix)
  }

  if (tags) {
    router = unshiftTagRoute(router, tags)
  }

  return router
}
