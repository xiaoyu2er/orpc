import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Hooks, Merge, Value } from '@orpc/shared'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { ANY_ROUTER, Router } from './router'
import type { Caller, Meta } from './types'
import { isLazy } from './lazy'
import { decorateLazy } from './lazy-decorated'
import { isProcedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'

export type CreateRouterCallerOptions<
  TRouter extends ANY_ROUTER,
> =
  & {
    router: TRouter
    /**
     * This is helpful for logging and analytics.
     *
     * @internal
     */
    path?: string[]
  }
  & (TRouter extends Router<infer UContext, any>
    ? undefined extends UContext ? { context?: Value<UContext> } : { context: Value<UContext> }
    : never)
  & Hooks<unknown, unknown, TRouter extends Router<infer UContext, any> ? UContext : never, Meta>

export type RouterCaller<
  TRouter extends ANY_ROUTER,
> = {
  [K in keyof TRouter]: TRouter[K] extends
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
    ? Caller<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>>
    : TRouter[K] extends ANY_ROUTER
      ? RouterCaller<TRouter[K]>
      : TRouter[K] extends Lazy<infer U>
        ? U extends ANY_ROUTER
          ? RouterCaller<U>
          : never
        : never
}

export function createRouterCaller<
  TRouter extends ANY_ROUTER,
>(
  options: CreateRouterCallerOptions<TRouter>,
): RouterCaller<TRouter> {
  return createRouterCallerInternal(options) as any
}

function createRouterCallerInternal(
  options: Merge<CreateRouterCallerOptions<ANY_ROUTER>, {
    router: ANY_ROUTER | ANY_ROUTER[string]
  }>,
) {
  const router = isLazy(options.router) ? decorateLazy(options.router) : options.router

  const procedureCaller = isLazy(options.router) || isProcedure(options.router)
    ? createProcedureCaller({
      ...options,
      procedure: router as any,
      context: options.context,
      path: options.path,
    })
    : {}

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = (router as any)[key]

      return createRouterCallerInternal({
        ...options,
        router: next,
        path: [...(options.path ?? []), key],
      })
    },
  })

  return recursive
}
