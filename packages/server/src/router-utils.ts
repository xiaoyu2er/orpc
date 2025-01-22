import type { Context, TypeInitialContext } from './context'
import type { Lazy } from './lazy'
import type { AnyMiddleware } from './middleware'
import type { AnyProcedure } from './procedure'
import type { AnyRouter } from './router'
import { adaptRoute, type ErrorMap, type HTTPPath, mergeErrorMap, type Route, type SchemaInput, type SchemaOutput } from '@orpc/contract'
import { deepSetLazyRouterPrefix, getLazyRouterPrefix } from './hidden'
import { flatLazy, isLazy, lazy, unlazy } from './lazy'
import { type DecoratedLazy, decorateLazy } from './lazy-decorated'
import { mergeMiddlewares } from './middleware-utils'
import { isProcedure, Procedure } from './procedure'

export type InferRouterInputs<T extends AnyRouter> =
  T extends Lazy<infer U extends AnyRouter> ? InferRouterInputs<U>
    : T extends Procedure<any, any, infer UInputSchema, any, any, any, any, any, any>
      ? SchemaInput<UInputSchema>
      : {
          [K in keyof T]: T[K] extends AnyRouter ? InferRouterInputs<T[K]> : never
        }

export type InferRouterOutputs<T extends AnyRouter> =
  T extends Lazy<infer U extends AnyRouter> ? InferRouterOutputs<U>
    : T extends Procedure<any, any, any, infer UOutputSchema, infer UFuncOutput, any, any, any, any>
      ? SchemaOutput<UOutputSchema, UFuncOutput>
      : {
          [K in keyof T]: T[K] extends AnyRouter ? InferRouterOutputs<T[K]> : never
        }

export type UnshiftedMiddlewaresRouter<TRouter extends AnyRouter, TInitialContext extends Context> =
  TRouter extends Lazy<infer U extends AnyRouter>
    ? DecoratedLazy<UnshiftedMiddlewaresRouter<U, TInitialContext>>
    : TRouter extends Procedure<any, infer UCurrentContext, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap, infer URoute, infer UMetaDef, infer UMeta>
      ? Procedure<TInitialContext, UCurrentContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap, URoute, UMetaDef, UMeta>
      : {
          [K in keyof TRouter]: TRouter[K] extends AnyRouter ? UnshiftedMiddlewaresRouter<TRouter[K], TInitialContext> : never
        }

export function unshiftMiddlewaresRouter<TRouter extends AnyRouter, TInitialContext extends Context>(
  router: TRouter,
  options: {
    __initialContext?: TypeInitialContext<TInitialContext>
    middlewares: AnyMiddleware[]
  },
): UnshiftedMiddlewaresRouter<TRouter, TInitialContext> {
  if (isLazy(router)) {
    const applied = decorateLazy(lazy(async () => {
      const unlaziedRouter = (await unlazy(router)).default as AnyRouter
      const applied = unshiftMiddlewaresRouter(unlaziedRouter, options) as any

      return { default: applied }
    }))

    return applied as any
  }

  if (isProcedure(router)) {
    const applied = new Procedure({
      ...router['~orpc'],
      middlewares: mergeMiddlewares(options.middlewares, router['~orpc'].middlewares),
    })

    return applied as any
  }

  const applied = {} as Record<string, any>

  for (const key in router) {
    applied[key] = unshiftMiddlewaresRouter(router[key]!, options)
  }

  return applied as any
}

export type AdaptedRouter<
  TRouter extends AnyRouter,
  TInitialContext extends Context,
  TErrorMapExtra extends ErrorMap,
> = TRouter extends Lazy<infer U extends AnyRouter>
  ? DecoratedLazy<AdaptedRouter<TInitialContext, U, TErrorMapExtra>>
  : TRouter extends Procedure<any, infer UCurrentContext, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap, any, infer UMetaDef, infer UMeta>
    ? Procedure<TInitialContext, UCurrentContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap & TErrorMapExtra, Route, UMetaDef, UMeta>
    : {
        [K in keyof TRouter]: TRouter[K] extends AnyRouter ? AdaptedRouter<TRouter[K], TInitialContext, TErrorMapExtra> : never
      }

export function adaptRouter<
  TRouter extends AnyRouter,
  TInitialContext extends Context,
  TErrorMapExtra extends ErrorMap,
>(
  router: TRouter,
  options: {
    __initialContext?: TypeInitialContext<TInitialContext>
    middlewares: AnyMiddleware[]
    tags?: readonly string[]
    prefix?: HTTPPath
    errorMap: ErrorMap
  },
): AdaptedRouter<TRouter, TInitialContext, TErrorMapExtra> {
  if (isLazy(router)) {
    const adapted = decorateLazy(lazy(async () => {
      const unlaziedRouter = (await unlazy(router)).default
      const adapted = adaptRouter(unlaziedRouter, options)
      return { default: adapted }
    }))

    const lazyPrefix = getLazyRouterPrefix(router)
    if (options.prefix || lazyPrefix) {
      const prefixed = deepSetLazyRouterPrefix(adapted, `${options.prefix ?? ''}${lazyPrefix ?? ''}` as any)

      return prefixed as any
    }

    return adapted as any
  }

  if (isProcedure(router)) {
    const adapted = new Procedure({
      ...router['~orpc'],
      route: adaptRoute(router['~orpc'].route, options.prefix, options.tags),
      middlewares: mergeMiddlewares(router['~orpc'].middlewares, options.middlewares),
      errorMap: mergeErrorMap(options.errorMap, router['~orpc'].errorMap),
    })

    return adapted as any
  }

  const adapted = {} as Record<string, any>
  for (const key in router) {
    adapted[key] = adaptRouter(router[key]!, options)
  }

  return adapted as any
}

export function getRouterChild<
  T extends AnyRouter | Lazy<undefined>,
>(router: T, ...path: string[]): T extends Lazy<any>
  ? Lazy<AnyProcedure> | Lazy<Record<string, AnyRouter>> | Lazy<undefined>
  : AnyRouter | Lazy<undefined> | undefined {
  let current: AnyRouter | Lazy<undefined> | undefined = router

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

    const newLazy = lazy(async () => {
      const unwrapped = await unlazy(lazied)

      if (!unwrapped.default) {
        return unwrapped
      }

      const next = getRouterChild(unwrapped.default, ...rest)

      return { default: next }
    })

    return flatLazy(newLazy)
  }

  return current as any
}
