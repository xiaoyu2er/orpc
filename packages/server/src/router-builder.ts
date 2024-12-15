import type { ANY_LAZY, DecoratedLazy, Lazy } from './lazy'
import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE, Procedure } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { Router } from './router'
import type { Context, MergeContext } from './types'
import { DecoratedContractProcedure, type HTTPPath } from '@orpc/contract'
import { createLazy, decorateLazy, isLazy, loadLazy } from './lazy'
import {
  decorateMiddleware,
  type MapInputMiddleware,
  type Middleware,
} from './middleware'
import { isProcedure } from './procedure'

export type AdaptedRouter<TRouter extends Router<any>> = {
  [K in keyof TRouter]: TRouter[K] extends Procedure<
    infer UContext,
    infer UExtraContext,
    infer UInputSchema,
    infer UOutputSchema,
    infer UFuncOutput
  >
    ? DecoratedProcedure<
      UContext,
      UExtraContext,
      UInputSchema,
      UOutputSchema,
      UFuncOutput
    >
    : TRouter[K] extends ANY_LAZY
      ? DecoratedLazy<TRouter[K]>
      : TRouter[K] extends Router<any>
        ? AdaptedRouter<TRouter[K]>
        : never
}

export const LAZY_ROUTER_PREFIX_SYMBOL = Symbol('ORPC_LAZY_ROUTER_PREFIX')

export class RouterBuilder<
  TContext extends Context,
  TExtraContext extends Context,
> {
  constructor(
    public zz$rb: {
      prefix?: HTTPPath
      tags?: string[]
      middlewares?: Middleware<any, any, any, any>[]
    },
  ) {
    if (zz$rb.prefix && zz$rb.prefix.includes('{')) {
      throw new Error('Prefix cannot contain "{" for dynamic routing')
    }
  }

  prefix(prefix: HTTPPath): RouterBuilder<TContext, TExtraContext> {
    return new RouterBuilder({
      ...this.zz$rb,
      prefix: `${this.zz$rb.prefix ?? ''}${prefix}`,
    })
  }

  tags(...tags: string[]): RouterBuilder<TContext, TExtraContext> {
    if (!tags.length)
      return this

    return new RouterBuilder({
      ...this.zz$rb,
      tags: [...(this.zz$rb.tags ?? []), ...tags],
    })
  }

  use<
    UExtraContext extends
    | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
    | undefined = undefined,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      unknown,
      unknown
    >,
  ): RouterBuilder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use<
    UExtraContext extends
    | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
    | undefined = undefined,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      unknown
    >,
    mapInput: MapInputMiddleware<unknown, UMappedInput>,
  ): RouterBuilder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use(
    middleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): RouterBuilder<any, any> {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new RouterBuilder({
      ...this.zz$rb,
      middlewares: [...(this.zz$rb.middlewares || []), middleware_],
    })
  }

  router<URouter extends Router<TContext>>(
    router: URouter,
  ): AdaptedRouter<URouter> {
    const handled = adaptRouter({
      routerOrChild: router,
      middlewares: this.zz$rb.middlewares,
      tags: this.zz$rb.tags,
      prefix: this.zz$rb.prefix,
    })

    return handled as any
  }

  lazy<U extends Router<TContext>>(
    loader: () => Promise<{ default: U }>,
  ): DecoratedLazy<U> {
    const lazy = adaptLazyRouter({
      current: createLazy(loader),
      middlewares: this.zz$rb.middlewares,
      tags: this.zz$rb.tags,
      prefix: this.zz$rb.prefix,
    })

    return lazy as any
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
    const current = (await loadLazy<any>(options.current)).default

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

  const decoratedLazy = Object.assign(decorateLazy(createLazy(loader)), {
    [LAZY_ROUTER_PREFIX_SYMBOL]: lazyRouterPrefix,
  })

  const recursive = new Proxy(decoratedLazy, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      return adaptLazyRouter({
        ...options,
        current: createLazy(async () => {
          const current = (await loadLazy<any>(options.current)).default
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
