import type { ConflictContextGuard, Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { FlattenLazy, Lazy } from './lazy'
import type { ANY_MIDDLEWARE, Middleware } from './middleware'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { ANY_ROUTER, Router } from './router'
import { type ContractRouter, type ErrorMap, type ErrorMapGuard, type ErrorMapSuggestions, type HTTPPath, mergePrefix, mergeTags, type Route, type StrictErrorMap } from '@orpc/contract'
import { deepSetLazyRouterPrefix, getLazyRouterPrefix } from './hidden'
import { flatLazy, isLazy, lazy, unlazy } from './lazy'
import { type DecoratedLazy, decorateLazy } from './lazy-decorated'
import { isProcedure } from './procedure'
import { DecoratedProcedure } from './procedure-decorated'

export type AdaptedRouter<
  TInitialContext extends Context,
  TRouter extends ANY_ROUTER,
  TErrorMapExtra extends ErrorMap,
> = TRouter extends Lazy<infer U extends ANY_ROUTER>
  ? DecoratedLazy<AdaptedRouter<TInitialContext, U, TErrorMapExtra>>
  : TRouter extends Procedure<any, infer UCurrentContext, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap, any>
    ? DecoratedProcedure<TInitialContext, UCurrentContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap & TErrorMapExtra, Route>
    : {
        [K in keyof TRouter]: TRouter[K] extends ANY_ROUTER ? AdaptedRouter<TInitialContext, TRouter[K], TErrorMapExtra> : never
      }

export type RouterBuilderDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
> = {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  prefix?: HTTPPath
  tags?: readonly string[]
  middlewares: Middleware<any, any, any, any, any>[]
  errorMap: TErrorMap
}

export class RouterBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'RouterBuilder' as const
  '~orpc': RouterBuilderDef<TInitialContext, TCurrentContext, TErrorMap>

  constructor(def: RouterBuilderDef<TInitialContext, TCurrentContext, TErrorMap>) {
    this['~orpc'] = def

    if (def.prefix && def.prefix.includes('{')) {
      throw new Error(`
        Dynamic routing in prefix not supported yet.
        Please remove "{" from "${def.prefix}".
      `)
    }
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    })
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap & U> {
    return new RouterBuilder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  use<U extends Context>(
    middleware: Middleware<TCurrentContext, U, unknown, unknown, Record<never, never> >,
  ): ConflictContextGuard<TCurrentContext & U>
    & RouterBuilder<TInitialContext, TCurrentContext & U, TErrorMap> {
    const builder = new RouterBuilder<TInitialContext, TCurrentContext & U, TErrorMap>({
      tags: this['~orpc'].tags,
      prefix: this['~orpc'].prefix,
      errorMap: this['~orpc'].errorMap,
      middlewares: [...this['~orpc'].middlewares, middleware as any],
    })

    return builder as typeof builder & ConflictContextGuard<TCurrentContext & U>
  }

  router<U extends Router<TCurrentContext, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    router: U,
  ): AdaptedRouter<TInitialContext, U, TErrorMap> {
    const adapted = adapt(router, this['~orpc'])
    return adapted as any
  }

  lazy<U extends Router<TCurrentContext, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TInitialContext, FlattenLazy<U>, TErrorMap> {
    const adapted = adapt(flatLazy(lazy(loader)), this['~orpc'])
    return adapted as any
  }
}

function adapt(
  item: ANY_ROUTER,
  options: {
    middlewares?: ANY_MIDDLEWARE[]
    tags?: readonly string[]
    prefix?: HTTPPath
    errorMap: ErrorMap
  },
): ANY_ROUTER {
  if (isLazy(item)) {
    const adaptedLazy = decorateLazy(lazy(async () => {
      const routerOrProcedure = (await unlazy(item)).default as ANY_ROUTER | ANY_PROCEDURE
      const adapted = adapt(routerOrProcedure, options)

      return { default: adapted }
    }))

    const lazyPrefix = getLazyRouterPrefix(item)
    if (options.prefix || lazyPrefix) {
      const prefixed = deepSetLazyRouterPrefix(adaptedLazy, `${options.prefix ?? ''}${lazyPrefix ?? ''}` as any)
      return prefixed
    }

    return adaptedLazy
  }

  if (isProcedure(item)) {
    let decorated = DecoratedProcedure.decorate(item)

    if (options.tags?.length) {
      decorated = decorated.unshiftTag(...options.tags)
    }

    if (options.prefix) {
      decorated = decorated.prefix(options.prefix)
    }

    if (options.middlewares?.length) {
      decorated = decorated.unshiftMiddleware(...options.middlewares)
    }

    // it prevent unnecessary call especially when implements a contract
    if (Object.keys(options.errorMap).length) {
    /**
     * The error map has been protected from conflicts at the type level,
     * so it is safe to cast here.
     */
      decorated = decorated.errors(options.errorMap as any)
    }

    return decorated
  }

  const adapted = {} as Record<string, any>
  for (const key in item) {
    adapted[key] = adapt(item[key]!, options)
  }

  return adapted
}
