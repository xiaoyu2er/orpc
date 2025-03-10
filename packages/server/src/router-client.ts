import type { ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Procedure } from './procedure'
import type { CreateProcedureClientOptions, ProcedureClient } from './procedure-client'
import type { AnyRouter, InferRouterInitialContext } from './router'
import { type ErrorMap, isLazy, type Lazyable, type Meta } from '@orpc/contract'
import { isProcedure } from './procedure'
import { createProcedureClient } from './procedure-client'
import { createLazyAssertedProcedure } from './procedure-utils'
import { getRouter } from './router-utils'

export type RouterClient<TRouter extends AnyRouter, TClientContext extends ClientContext = Record<never, never>> =
  TRouter extends Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap, any>
    ? ProcedureClient<TClientContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap>
    : {
        [K in keyof TRouter]: TRouter[K] extends Lazyable<infer U extends AnyRouter> ? RouterClient<U, TClientContext> : never
      }

export function createRouterClient<TRouter extends AnyRouter, TClientContext extends ClientContext>(
  router: Lazyable<TRouter | undefined>,
  ...[options]: MaybeOptionalOptions<
    CreateProcedureClientOptions<
      InferRouterInitialContext<TRouter>,
      undefined,
      undefined,
      unknown,
      ErrorMap,
      Meta,
      TClientContext
    >
  >
): RouterClient<TRouter, TClientContext> {
  if (isProcedure(router)) {
    const caller = createProcedureClient(router, options as any)

    return caller as any
  }

  const procedureCaller = isLazy(router)
    ? createProcedureClient(createLazyAssertedProcedure(router), options as any)
    : {}

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getRouter(router, [key])

      if (!next) {
        return Reflect.get(target, key)
      }

      return createRouterClient(next, {
        ...options,
        path: [...(options?.path ?? []), key],
      } as any)
    },
  })

  return recursive as any
}
