import type { ErrorMap, Meta } from '@orpc/contract'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { CreateProcedureClientRest, ProcedureClient } from './procedure-client'
import type { AnyRouter, Router } from './router'
import { isLazy } from './lazy'
import { createLazyProcedureFormAnyLazy } from './lazy-utils'
import { isProcedure } from './procedure'
import { createProcedureClient } from './procedure-client'
import { getRouterChild } from './router'

export type RouterClient<TRouter extends AnyRouter, TClientContext> = TRouter extends Lazy<infer U extends AnyRouter>
  ? RouterClient<U, TClientContext>
  : TRouter extends Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap, any>
    ? ProcedureClient<TClientContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap>
    : {
        [K in keyof TRouter]: TRouter[K] extends AnyRouter ? RouterClient<TRouter[K], TClientContext> : never
      }

export function createRouterClient<
  TRouter extends AnyRouter,
  TClientContext,
>(
  router: TRouter | Lazy<undefined>,
  ...rest: CreateProcedureClientRest<
    TRouter extends Router<infer UContext, any> ? UContext : never,
    undefined,
    undefined,
    unknown,
    ErrorMap,
    Meta,
    TClientContext
  >
): RouterClient<TRouter, TClientContext> {
  if (isProcedure(router)) {
    const caller = createProcedureClient(router, ...rest)

    return caller as any
  }

  const procedureCaller = isLazy(router)
    ? createProcedureClient(createLazyProcedureFormAnyLazy(router), ...rest)
    : {}

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getRouterChild(router, key)

      if (!next) {
        return Reflect.get(target, key)
      }

      const [options] = rest as any

      return createRouterClient(next, {
        ...options,
        path: [...(options?.path ?? []), key],
      })
    },
  })

  return recursive as any
}
