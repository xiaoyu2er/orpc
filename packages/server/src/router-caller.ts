import type {} from '@orpc/contract'
import type { Router } from './router'
import type { Meta, Promisable } from './types'
import { isProcedure, type Procedure } from './procedure'
import { createProcedureCaller, type ProcedureCaller } from './procedure-caller'
import {} from './utils'

export interface CreateRouterCallerOptions<
  TRouter extends Router<any>,
  TValidate extends boolean,
> {
  router: TRouter

  /**
   * The context used when calling the procedure.
   */
  context: TRouter extends Router<infer UContext> ? UContext : never

  /**
   * Helpful hooks to do some logics on specific time.
   */
  hooks?: (
    context: TRouter extends Router<infer UContext> ? UContext : never,
    meta: Meta<unknown>,
  ) => Promisable<void>

  /**
   * This is helpful for logging and analytics.
   */
  basePath?: string[]

  /**
   * This flag helpful when you want bypass some logics not necessary to internal server calls.
   *
   * @default true
   */
  internal?: boolean

  /**
   * Indicate whether validate input and output.
   *
   * @default true
   */
  validate?: TValidate
}

export type RouterCaller<
  TRouter extends Router<any>,
  TValidate extends boolean,
> = {
  [K in keyof TRouter]: TRouter[K] extends Procedure<any, any, any, any, any>
    ? ProcedureCaller<TRouter[K], TValidate>
    : TRouter[K] extends Router<any>
      ? RouterCaller<TRouter[K], TValidate>
      : never
}

export function createRouterCaller<
  TRouter extends Router<any>,
  TValidate extends boolean = true,
>(
  options: CreateRouterCallerOptions<TRouter, TValidate>,
): RouterCaller<TRouter, TValidate> {
  const internal = options.internal ?? true
  const validate = options.validate ?? true

  const caller: Record<string, unknown> = {}

  for (const key in options.router) {
    const path = [...(options.basePath ?? []), key]
    const item = options.router[key]

    if (isProcedure(item)) {
      caller[key] = createProcedureCaller({
        procedure: item,
        context: options.context as any,
        hooks: options.hooks as any,
        path,
        internal,
        validate,
      })
    }
    else {
      caller[key] = createRouterCaller({
        router: item as any,
        context: options.context,
        hooks: options.hooks,
        basePath: path,
        internal,
        validate,
      })
    }
  }

  return caller as RouterCaller<TRouter, TValidate>
}
