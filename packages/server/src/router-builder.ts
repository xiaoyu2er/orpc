import type { ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, StrictErrorMap } from '@orpc/contract'
import type { FlattenLazy, Lazy } from './lazy'
import type { ANY_MIDDLEWARE, Middleware } from './middleware'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { ANY_ROUTER, Router } from './router'
import type { Context, MergeContext } from './types'
import { deepSetLazyRouterPrefix, getLazyRouterPrefix } from './hidden'
import { flatLazy, isLazy, lazy, unlazy } from './lazy'
import { type DecoratedLazy, decorateLazy } from './lazy-decorated'
import { isProcedure } from './procedure'
import { DecoratedProcedure } from './procedure-decorated'

export type AdaptedRouter<
  TContext extends Context,
  TRouter extends ANY_ROUTER,
  TErrorMapExtra extends ErrorMap,
> = TRouter extends Lazy<infer U extends ANY_ROUTER>
  ? DecoratedLazy<AdaptedRouter<TContext, U, TErrorMapExtra>>
  : TRouter extends Procedure<any, infer UExtraContext, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap>
    ? DecoratedProcedure<TContext, UExtraContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap & TErrorMapExtra>
    : {
        [K in keyof TRouter]: TRouter[K] extends ANY_ROUTER ? AdaptedRouter<TContext, TRouter[K], TErrorMapExtra> : never
      }

export type RouterBuilderDef<TContext extends Context, TExtraContext extends Context, TErrorMap extends ErrorMap> = {
  prefix?: HTTPPath
  tags?: readonly string[]
  middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, Record<never, never>>[]
  errorMap: TErrorMap
}

export class RouterBuilder<
  TContext extends Context,
  TExtraContext extends Context,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'RouterBuilder' as const
  '~orpc': RouterBuilderDef<TContext, TExtraContext, TErrorMap>

  constructor(def: RouterBuilderDef<TContext, TExtraContext, TErrorMap>) {
    this['~orpc'] = def

    if (def.prefix && def.prefix.includes('{')) {
      throw new Error(`
        Dynamic routing in prefix not supported yet.
        Please remove "{" from "${def.prefix}".
      `)
    }
  }

  prefix(prefix: HTTPPath): RouterBuilder<TContext, TExtraContext, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      prefix: `${this['~orpc'].prefix ?? ''}${prefix}`,
    })
  }

  tag(...tags: string[]): RouterBuilder<TContext, TExtraContext, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      tags: [...(this['~orpc'].tags ?? []), ...tags],
    })
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): RouterBuilder<TContext, TExtraContext, TErrorMap & U> {
    return new RouterBuilder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      unknown,
      unknown,
      Record<never, never>
    >,
  ): RouterBuilder<TContext, MergeContext<TExtraContext, U>, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      middlewares: [...this['~orpc'].middlewares, middleware as any],
    })
  }

  router<U extends Router<MergeContext<TContext, TExtraContext>, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    router: U,
  ): AdaptedRouter<TContext, U, TErrorMap> {
    const adapted = adapt(router, this['~orpc'])
    return adapted as any
  }

  lazy<U extends Router<MergeContext<TContext, TExtraContext>, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TContext, FlattenLazy<U>, TErrorMap> {
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

    /**
     * The error map has been protected from conflicts at the type level,
     * so it is safe to cast here.
     */
    decorated = decorated.errors(options.errorMap as any)

    return decorated
  }

  const adapted = {} as Record<string, any>
  for (const key in item) {
    adapted[key] = adapt(item[key]!, options)
  }

  return adapted
}
