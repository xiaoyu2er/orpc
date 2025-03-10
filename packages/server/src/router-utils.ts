import type { ContractProcedureCallbackOptions, EnhanceRouteOptions, ErrorMap, Lazy, Lazyable, MergedErrorMap } from '@orpc/contract'
import type { Context } from './context'
import type { AnyMiddleware } from './middleware'
import type { AnyRouter } from './router'
import {
  createAccessibleLazyContractRouter,
  enhanceRoute,
  getContractRouter,
  getLazyMeta,
  isLazy,
  lazy,
  mergeErrorMap,
  mergePrefix,
  traverseContractProcedures as traverseContractProceduresInternal,
  unlazy,
} from '@orpc/contract'
import { mergeMiddlewares } from './middleware-utils'
import { type AnyProcedure, isProcedure, Procedure } from './procedure'

export function getRouter<T extends Lazyable<AnyRouter | undefined>>(
  router: T,
  path: readonly string[],
): T extends Lazy<any> ? Lazy<AnyRouter | undefined> : Lazyable<AnyRouter | undefined> {
  return getContractRouter(router, path) as any
}

export type AccessibleLazyRouter<T extends Lazyable<AnyRouter | undefined>> =
    T extends Lazy<infer U extends AnyRouter | undefined | Lazy<AnyRouter | undefined>>
      ? AccessibleLazyRouter<U>
      : T extends AnyProcedure | undefined
        ? Lazy<T>
        : Lazy<T> & {
          [K in keyof T]: T[K] extends Lazyable<AnyRouter> ? AccessibleLazyRouter<T[K]> : never
        }

export function createAccessibleLazyRouter<T extends Lazy<AnyRouter | undefined>>(lazied: T): AccessibleLazyRouter<T> {
  return createAccessibleLazyContractRouter(lazied) as any
}

export type EnhancedRouter<T extends Lazyable<AnyRouter>, TInitialContext extends Context, TErrorMap extends ErrorMap> =
  T extends Lazy<infer U extends AnyRouter>
    ? AccessibleLazyRouter<EnhancedRouter<U, TInitialContext, TErrorMap>>
    : T extends Procedure<
      any,
      infer UCurrentContext,
      infer UInputSchema,
      infer UOutputSchema,
      infer UFuncOutput,
      infer UErrorMap,
      infer UMeta
    >
      ? Procedure<
        TInitialContext,
        UCurrentContext,
        UInputSchema,
        UOutputSchema,
        UFuncOutput,
        MergedErrorMap<TErrorMap, UErrorMap>,
        UMeta
      >
      : {
          [K in keyof T]: T[K] extends Lazyable<AnyRouter> ? EnhancedRouter<T[K], TInitialContext, TErrorMap> : never
        }

export interface EnhanceRouterOptions<TErrorMap extends ErrorMap> extends EnhanceRouteOptions {
  middlewares: readonly AnyMiddleware[]
  errorMap: TErrorMap
}

export function enhanceRouter<T extends Lazyable<AnyRouter>, TInitialContext extends Context, TErrorMap extends ErrorMap>(
  router: T,
  options: EnhanceRouterOptions<TErrorMap>,
): EnhancedRouter<T, TInitialContext, TErrorMap> {
  if (isLazy(router)) {
    const laziedMeta = getLazyMeta(router)
    const enhancedPrefix = laziedMeta?.prefix ? mergePrefix(options.prefix, laziedMeta?.prefix) : options.prefix

    const enhanced = lazy(async () => {
      const { default: unlaziedRouter } = await unlazy(router)
      const enhanced = enhanceRouter(unlaziedRouter, options)
      return unlazy(enhanced)
    }, {
      ...laziedMeta,
      prefix: enhancedPrefix,
    })

    const accessible = createAccessibleLazyRouter(enhanced)

    return accessible as any
  }

  if (isProcedure(router)) {
    const newMiddlewares = mergeMiddlewares(options.middlewares, router['~orpc'].middlewares)
    const newMiddlewareAdded = newMiddlewares.length - router['~orpc'].middlewares.length

    const enhanced = new Procedure({
      ...router['~orpc'],
      route: enhanceRoute(router['~orpc'].route, options),
      errorMap: mergeErrorMap(options.errorMap, router['~orpc'].errorMap),
      middlewares: newMiddlewares,
      inputValidationIndex: router['~orpc'].inputValidationIndex + newMiddlewareAdded,
      outputValidationIndex: router['~orpc'].outputValidationIndex + newMiddlewareAdded,
    })

    return enhanced as any
  }

  const enhanced = {} as Record<string, any>

  for (const key in router) {
    enhanced[key] = enhanceRouter(router[key]!, options)
  }

  return enhanced as any
}

export interface TraverseContractProceduresOptions {
  router: AnyRouter
  path: readonly string[]
}

export interface LazyTraverseContractProceduresOptions {
  router: Lazy<AnyRouter>
  path: readonly string[]
}

export function traverseContractProcedures(
  options: TraverseContractProceduresOptions,
  callback: (options: ContractProcedureCallbackOptions) => void,
  lazyOptions: LazyTraverseContractProceduresOptions[] = [],
): LazyTraverseContractProceduresOptions[] {
  return traverseContractProceduresInternal(options, callback, lazyOptions) as LazyTraverseContractProceduresOptions[]
}
