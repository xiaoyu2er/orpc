import type { AnyContractProcedure, AnyContractRouter, EnhanceRouteOptions, ErrorMap, MergedErrorMap } from '@orpc/contract'
import type { Context } from './context'
import type { AnyMiddleware } from './middleware'
import type { AnyRouter } from './router'
import { enhanceRoute, isContractProcedure, mergeErrorMap, mergePrefix } from '@orpc/contract'
import { getLazyMeta, isLazy, lazy, type Lazy, type Lazyable, unlazy } from './lazy'
import { mergeMiddlewares } from './middleware-utils'
import { type AnyProcedure, isProcedure, Procedure } from './procedure'
import { getHiddenRouterContract } from './router-hidden'

export function getRouter<T extends Lazyable<AnyRouter | undefined>>(
  router: T,
  path: readonly string[],
): T extends Lazy<any> ? Lazy<AnyRouter | undefined> : Lazyable<AnyRouter | undefined> {
  let current: Lazyable<AnyRouter | undefined> = router

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!

    if (!current) {
      return undefined as any
    }

    if (isProcedure(current)) {
      return undefined as any
    }

    if (!isLazy(current)) {
      current = current[segment]

      continue
    }

    const lazied = current
    const rest = path.slice(i)

    return lazy(async () => {
      const unwrapped = await unlazy(lazied)

      const next = getRouter(unwrapped.default, rest)

      return unlazy(next)
    }, getLazyMeta(lazied))
  }

  return current as any
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
  const recursive = new Proxy(lazied, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getRouter(lazied, [key])

      return createAccessibleLazyRouter(next)
    },
  })

  return recursive as any
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
  router: AnyContractRouter | AnyRouter
  path: readonly string[]
}

export interface ContractProcedureCallbackOptions {
  contract: AnyContractProcedure
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
  let currentRouter: AnyContractRouter | Lazyable<AnyRouter> = options.router

  const hiddenContract = getHiddenRouterContract(options.router)

  if (hiddenContract !== undefined) {
    currentRouter = hiddenContract
  }

  if (isLazy(currentRouter)) {
    lazyOptions.push({
      router: currentRouter,
      path: options.path,
    })
  }

  else if (isContractProcedure(currentRouter)) {
    callback({
      contract: currentRouter,
      path: options.path,
    })
  }

  else {
    for (const key in currentRouter) {
      traverseContractProcedures(
        {
          router: (currentRouter as any)[key],
          path: [...options.path, key],
        },
        callback,
        lazyOptions,
      )
    }
  }

  return lazyOptions
}

export async function resolveContractProcedures(
  options: TraverseContractProceduresOptions,
  callback: (options: ContractProcedureCallbackOptions) => void,
) {
  const pending: TraverseContractProceduresOptions[] = [options]

  for (const options of pending) {
    const lazyOptions = traverseContractProcedures(options, callback)

    for (const options of lazyOptions) {
      const { default: router } = await unlazy(options.router)

      pending.push({
        router,
        path: options.path,
      })
    }
  }
}
