import type { ErrorMap, MergedErrorMap } from './error'
import type { Lazy, Lazyable } from './lazy'
import type { EnhanceRouteOptions } from './route'
import type { AnyContractRouter } from './router'
import { mergeErrorMap } from './error'
import { getLazyMeta, isLazy, lazy, unlazy } from './lazy'
import { type AnyContractProcedure, ContractProcedure, isContractProcedure } from './procedure'
import { enhanceRoute, mergePrefix } from './route'
import { getHiddenRouterContract } from './router-hidden'

export function getContractRouter<T extends Lazyable<AnyContractRouter | undefined>>(
  router: T,
  path: readonly string[],
): T extends Lazy<any> ? Lazy<AnyContractRouter | undefined> : Lazyable<AnyContractRouter | undefined> {
  let current: Lazyable<AnyContractRouter | undefined> = router

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!

    if (!current) {
      return undefined as any
    }

    if (isContractProcedure(current)) {
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

      const next = getContractRouter(unwrapped.default, rest)

      return unlazy(next)
    }, getLazyMeta(lazied))
  }

  return current as any
}

export type AccessibleLazyContractRouter<T extends Lazyable<AnyContractRouter | undefined>> =
    T extends Lazy<infer U extends AnyContractRouter>
      ? AccessibleLazyContractRouter<U>
      : T extends AnyContractProcedure | undefined
        ? Lazy<T>
        : Lazy<T> & {
          [K in keyof T]: T[K] extends Lazyable<AnyContractRouter> ? AccessibleLazyContractRouter<T[K]> : never
        }

export function createAccessibleLazyContractRouter<T extends Lazy<AnyContractRouter | undefined>>(lazied: T): AccessibleLazyContractRouter<T> {
  const recursive = new Proxy(lazied, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getContractRouter(lazied, [key])

      return createAccessibleLazyContractRouter(next)
    },
  })

  return recursive as any
}

export type EnhancedContractRouter<T extends Lazyable<AnyContractRouter>, TErrorMap extends ErrorMap> =
    T extends Lazy<infer U extends AnyContractRouter>
      ? AccessibleLazyContractRouter<EnhancedContractRouter<U, TErrorMap>>
      : T extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrors, infer UMeta>
        ? ContractProcedure<UInputSchema, UOutputSchema, MergedErrorMap<TErrorMap, UErrors>, UMeta>
        : {
            [K in keyof T]: T[K] extends Lazyable<AnyContractRouter> ? EnhancedContractRouter<T[K], TErrorMap> : never
          }

export interface EnhanceContractRouterOptions<TErrorMap extends ErrorMap> extends EnhanceRouteOptions {
  errorMap: TErrorMap
}

export function enhanceContractRouter<T extends Lazyable<AnyContractRouter>, TErrorMap extends ErrorMap>(
  router: T,
  options: EnhanceContractRouterOptions<TErrorMap>,
): EnhancedContractRouter<T, TErrorMap> {
  if (isLazy(router)) {
    const laziedMeta = getLazyMeta(router)
    const enhancedPrefix = laziedMeta?.prefix ? mergePrefix(options.prefix, laziedMeta?.prefix) : options.prefix

    const enhanced = lazy(async () => {
      const unlaziedRouter = (await unlazy(router)).default
      const adapted = enhanceContractRouter(unlaziedRouter, options)
      return unlazy(adapted)
    }, {
      ...laziedMeta,
      prefix: enhancedPrefix,
    })

    const accessible = createAccessibleLazyContractRouter(enhanced)

    return accessible as any
  }

  if (isContractProcedure(router)) {
    const enhanced = new ContractProcedure({
      ...router['~orpc'],
      errorMap: mergeErrorMap(options.errorMap, router['~orpc'].errorMap),
      route: enhanceRoute(router['~orpc'].route, options),
    })

    return enhanced as any
  }

  const enhanced: Record<string, any> = {}

  for (const key in router) {
    enhanced[key] = enhanceContractRouter(router[key]!, options)
  }

  return enhanced as any
}

export interface TraverseContractProceduresOptions {
  router: AnyContractRouter
  path: readonly string[]
}

export interface ContractProcedureCallbackOptions {
  contract: AnyContractProcedure
  path: readonly string[]
}

export interface LazyTraverseContractProceduresOptions {
  router: Lazy<AnyContractRouter>
  path: readonly string[]
}

export function traverseContractProcedures(
  options: TraverseContractProceduresOptions,
  callback: (options: ContractProcedureCallbackOptions) => void,
  lazyOptions: LazyTraverseContractProceduresOptions[] = [],
): LazyTraverseContractProceduresOptions[] {
  let currentRouter: Lazyable<AnyContractRouter> = options.router

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

  for (const item of pending) {
    const lazyOptions = traverseContractProcedures(item, callback)

    for (const options of lazyOptions) {
      const { default: router } = await unlazy(options.router)

      pending.push({
        router,
        path: options.path,
      })
    }
  }
}
