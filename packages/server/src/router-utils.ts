import type { Context, TypeInitialContext } from './context'
import type { Lazy } from './lazy'
import type { ANY_MIDDLEWARE } from './middleware'
import type { ANY_ROUTER } from './router'
import { isLazy, lazy, unlazy } from './lazy'
import { type DecoratedLazy, decorateLazy } from './lazy-decorated'
import { isProcedure, type Procedure } from './procedure'
import { DecoratedProcedure } from './procedure-decorated'

export type UnshiftedMiddlewaresRouter<TRouter extends ANY_ROUTER, TInitialContext extends Context> =
  TRouter extends Lazy<infer U extends ANY_ROUTER>
    ? DecoratedLazy<UnshiftedMiddlewaresRouter<TInitialContext, U>>
    : TRouter extends Procedure<any, infer UCurrentContext, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap, infer URoute>
      ? DecoratedProcedure<TInitialContext, UCurrentContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap, URoute>
      : {
          [K in keyof TRouter]: TRouter[K] extends ANY_ROUTER ? UnshiftedMiddlewaresRouter<TRouter[K], TInitialContext> : never
        }

export function unshiftMiddlewaresRouter<TRouter extends ANY_ROUTER, TInitialContext extends Context>(
  router: TRouter,
  options: {
    __initialContext?: TypeInitialContext<TInitialContext>
    middlewares: ANY_MIDDLEWARE[]
  },
): UnshiftedMiddlewaresRouter<TRouter, TInitialContext> {
  if (isLazy(router)) {
    const applied = decorateLazy(lazy(async () => {
      const unlaziedRouter = (await unlazy(router)).default as ANY_ROUTER
      const applied = unshiftMiddlewaresRouter(unlaziedRouter, options) as any

      return { default: applied }
    }))

    return applied as any
  }

  if (isProcedure(router)) {
    let decorated = DecoratedProcedure.decorate(router)

    if (options.middlewares.length) {
      decorated = decorated.unshiftMiddleware(...options.middlewares)
    }

    return decorated as any
  }

  const applied = {} as Record<string, any>

  for (const key in router) {
    applied[key] = unshiftMiddlewaresRouter(router[key]!, options)
  }

  return applied as any
}
