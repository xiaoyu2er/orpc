import type { AnyContractRouter, ContractProcedure, ErrorMap, HTTPPath, MergedErrorMap, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Context } from './context'
import type { Lazy, Lazyable } from './lazy'
import type { AnyMiddleware } from './middleware'
import type { AnyProcedure } from './procedure'
import { adaptRoute, mergeErrorMap, mergePrefix } from '@orpc/contract'
import { deepSetLazyRouterPrefix, getLazyRouterPrefix } from './hidden'
import { isLazy, lazy, unlazy } from './lazy'
import { flatLazy } from './lazy-utils'
import { mergeMiddlewares } from './middleware-utils'
import { isProcedure, Procedure } from './procedure'
import { type AccessibleLazyRouter, createAccessibleLazyRouter } from './router-accessible-lazy'

export type Router<
  TInitialContext extends Context,
  TContract extends AnyContractRouter,
> = Lazyable<
  TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer UMeta>
    ? Procedure<TInitialContext, any, UInputSchema, UOutputSchema, any, UErrorMap, UMeta>
    : {
        [K in keyof TContract]: TContract[K] extends AnyContractRouter ? Router<TInitialContext, TContract[K]> : never
      }
>

export type AnyRouter = Router<any, any>

export type InferRouterInitialContext<T extends AnyRouter> = T extends Router<infer UInitialContext, any>
  ? UInitialContext
  : never

export type InferRouterInputs<T extends AnyRouter> =
  T extends Lazy<infer U extends AnyRouter> ? InferRouterInputs<U>
    : T extends Procedure<any, any, infer UInputSchema, any, any, any, any>
      ? SchemaInput<UInputSchema>
      : {
          [K in keyof T]: T[K] extends AnyRouter ? InferRouterInputs<T[K]> : never
        }

export type InferRouterOutputs<T extends AnyRouter> =
  T extends Lazy<infer U extends AnyRouter> ? InferRouterOutputs<U>
    : T extends Procedure<any, any, any, infer UOutputSchema, infer UFuncOutput, any, any>
      ? SchemaOutput<UOutputSchema, UFuncOutput>
      : {
          [K in keyof T]: T[K] extends AnyRouter ? InferRouterOutputs<T[K]> : never
        }

export type AdaptedRouter<
  TRouter extends AnyRouter,
  TInitialContext extends Context,
  TErrorMap extends ErrorMap,
> = TRouter extends Lazy<infer U extends AnyRouter>
  ? AccessibleLazyRouter<AdaptedRouter<U, TInitialContext, TErrorMap>>
  : TRouter extends Procedure<
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
        [K in keyof TRouter]: TRouter[K] extends AnyRouter ? AdaptedRouter<TRouter[K], TInitialContext, TErrorMap> : never
      }

export interface AdaptRouterOptions< TErrorMap extends ErrorMap> {
  middlewares: AnyMiddleware[]
  tags?: readonly string[]
  prefix?: HTTPPath
  errorMap: TErrorMap
}

export function adaptRouter<
  TRouter extends AnyRouter,
  TInitialContext extends Context,
  TErrorMap extends ErrorMap,
>(
  router: TRouter,
  options: AdaptRouterOptions<TErrorMap>,
): AdaptedRouter<TRouter, TInitialContext, TErrorMap> {
  if (isLazy(router)) {
    const adapted = lazy(async () => {
      const unlaziedRouter = (await unlazy(router)).default
      const adapted = adaptRouter(unlaziedRouter, options)
      return { default: adapted }
    })

    const accessible = createAccessibleLazyRouter(adapted)

    const currentPrefix = getLazyRouterPrefix(router)
    const prefix = currentPrefix ? mergePrefix(options.prefix, currentPrefix) : options.prefix

    if (prefix) {
      return deepSetLazyRouterPrefix(accessible, prefix) as any
    }

    return accessible as any
  }

  if (isProcedure(router)) {
    const newMiddlewares = mergeMiddlewares(options.middlewares, router['~orpc'].middlewares)
    const newMiddlewareAdded = newMiddlewares.length - router['~orpc'].middlewares.length

    const adapted = new Procedure({
      ...router['~orpc'],
      route: adaptRoute(router['~orpc'].route, options),
      errorMap: mergeErrorMap(options.errorMap, router['~orpc'].errorMap),
      middlewares: newMiddlewares,
      inputValidationIndex: router['~orpc'].inputValidationIndex + newMiddlewareAdded,
      outputValidationIndex: router['~orpc'].outputValidationIndex + newMiddlewareAdded,
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
