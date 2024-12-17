import type { Lazy } from './lazy'
import type { DecoratedLazy } from './lazy-decorated'
import type { Middleware } from './middleware'
import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE, Procedure } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { ANY_ROUTER, Router } from './router'
import type { Context, MergeContext } from './types'
import { DecoratedContractProcedure, type HTTPPath } from '@orpc/contract'
import { isLazy, lazy, unwrapLazy } from './lazy'
import { isProcedure } from './procedure'

export type AdaptedRouter<
  TContext extends Context,
  TRouter extends Router<any, any>,
> = {
  [K in keyof TRouter]: TRouter[K] extends Procedure<
    any,
    infer UExtraContext,
    infer UInputSchema,
    infer UOutputSchema,
    infer UFuncOutput
  >
    ? DecoratedProcedure<
      TContext,
      UExtraContext,
      UInputSchema,
      UOutputSchema,
      UFuncOutput
    >
    : TRouter[K] extends Lazy<infer U>
      ? U extends Procedure<
        any,
        infer UExtraContext,
        infer UInputSchema,
        infer UOutputSchema,
        infer UFuncOutput
      >
        ? DecoratedLazy<DecoratedProcedure<
          TContext,
          UExtraContext,
          UInputSchema,
          UOutputSchema,
          UFuncOutput
        >>
        : U extends ANY_ROUTER
          ? DecoratedLazy<AdaptedRouter<TContext, U>>
          : never
      : TRouter[K] extends ANY_ROUTER
        ? AdaptedRouter<TContext, TRouter[K]>
        : never
}

export type RouterBuilderDef<TContext extends Context, TExtraContext extends Context> = {
  prefix?: HTTPPath
  tags?: readonly string[]
  middlewares?: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any>[]
}

export const LAZY_ROUTER_PREFIX_SYMBOL = Symbol('ORPC_LAZY_ROUTER_PREFIX')

export class RouterBuilder<
  TContext extends Context,
  TExtraContext extends Context,
> {
  '~type' = 'RouterBuilder' as const
  '~orpc': RouterBuilderDef<TContext, TExtraContext>

  constructor(def: RouterBuilderDef<TContext, TExtraContext>) {
    this['~orpc'] = def

    if (def.prefix && def.prefix.includes('{')) {
      throw new Error(`
        Dynamic routing in prefix not supported yet.
        Please remove "{" from "${def.prefix}".
      `)
    }
  }

  prefix(prefix: HTTPPath): RouterBuilder<TContext, TExtraContext> {
    return new RouterBuilder({
      ...this['~orpc'],
      prefix: `${this['~orpc'].prefix ?? ''}${prefix}`,
    })
  }

  tag(...tags: string[]): RouterBuilder<TContext, TExtraContext> {
    return new RouterBuilder({
      ...this['~orpc'],
      tags: [...(this['~orpc'].tags ?? []), ...tags],
    })
  }

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      unknown,
      unknown
    >,
  ): RouterBuilder<TContext, MergeContext<TExtraContext, U>> {
    return new RouterBuilder({
      ...this['~orpc'],
      middlewares: [...(this['~orpc'].middlewares ?? []), middleware as any],
    })
  }

  router<U extends Router<MergeContext<TContext, TExtraContext>, any>>(
    router: U,
  ): AdaptedRouter<TContext, U> {
    const handled = adaptRouter({
      routerOrChild: router,
      middlewares: this.zz$rb.middlewares,
      tags: this.zz$rb.tags,
      prefix: this.zz$rb.prefix,
    })

    return handled as any
  }

  lazy<U extends Router<MergeContext<TContext, TExtraContext>, any>>(
    loader: () => Promise<{ default: U }>,
  ): DecoratedLazy<AdaptedRouter<TContext, U>> {
    const lazied = adaptLazyRouter({
      current: lazy(loader),
      middlewares: this.zz$rb.middlewares,
      tags: this.zz$rb.tags,
      prefix: this.zz$rb.prefix,
    })

    return lazied as any
  }
}

function adaptRouter(options: {
  routerOrChild: Router<any> | Router<any>[keyof Router<any>]
  middlewares?: Middleware<any, any, any, any>[]
  tags?: string[]
  prefix?: HTTPPath
}) {
  if (isProcedure(options.routerOrChild)) {
    return adaptProcedure({
      ...options,
      procedure: options.routerOrChild,
    })
  }

  if (isLazy(options.routerOrChild)) {
    return adaptLazyRouter({
      ...options,
      current: options.routerOrChild,
    })
  }

  const handled: Record<string, any> = {}

  for (const key in options.routerOrChild) {
    handled[key] = adaptRouter({
      ...options,
      routerOrChild: options.routerOrChild[key]!,
    })
  }

  return handled as any
}

function adaptLazyRouter(options: {
  current: ANY_LAZY_PROCEDURE | Lazy<Router<any>>
  middlewares?: Middleware<any, any, any, any>[]
  tags?: string[]
  prefix?: HTTPPath
}): DecoratedLazy<ANY_LAZY_PROCEDURE | Lazy<Router<any>>> {
  const loader = async (): Promise<{ default: unknown }> => {
    const current = (await unwrapLazy<any>(options.current)).default

    return {
      default: adaptRouter({
        ...options,
        routerOrChild: current,
      }),
    }
  }

  let lazyRouterPrefix = options.prefix

  if (LAZY_ROUTER_PREFIX_SYMBOL in options.current && typeof options.current[LAZY_ROUTER_PREFIX_SYMBOL] === 'string') {
    lazyRouterPrefix = `${options.current[LAZY_ROUTER_PREFIX_SYMBOL]}${lazyRouterPrefix ?? ''}` as HTTPPath
  }

  const decoratedLazy = Object.assign(decorateLazy(lazy(loader)), {
    [LAZY_ROUTER_PREFIX_SYMBOL]: lazyRouterPrefix,
  })

  const recursive = new Proxy(decoratedLazy, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      return adaptLazyRouter({
        ...options,
        current: lazy(async () => {
          const current = (await unwrapLazy<any>(options.current)).default
          return { default: current[key] }
        }),
      })
    },
  })

  return recursive as any
}

function adaptProcedure(options: {
  procedure: ANY_PROCEDURE
  middlewares?: Middleware<any, any, any, any>[]
  tags?: string[]
  prefix?: HTTPPath
}): DecoratedProcedure<any, any, any, any, any> {
  const builderMiddlewares = options.middlewares ?? []
  const procedureMiddlewares = options.procedure.zz$p.middlewares ?? []

  const middlewares = [
    ...builderMiddlewares,
    ...procedureMiddlewares.filter(
      item => !builderMiddlewares.includes(item),
    ),
  ]

  let contract = DecoratedContractProcedure.decorate(
    options.procedure.zz$p.contract,
  ).unshiftTag(...(options.tags ?? []))

  if (options.prefix) {
    contract = contract.prefix(options.prefix)
  }

  return decorateProcedure({
    zz$p: {
      ...options.procedure.zz$p,
      contract,
      middlewares,
    },
  })
}
