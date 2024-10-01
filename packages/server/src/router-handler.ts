import { type HTTPPath, standardizeHTTPPath } from '@orpc/contract'
import { LinearRouter } from 'hono/router/linear-router'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { get } from 'radash'
import { ORPCError } from './error'
import { type WELL_DEFINED_PROCEDURE, isProcedure } from './procedure'
import type { DecoratedRouter, Router } from './router'
import type { Meta, Promisable } from './types'
import { hook, mergeContext } from './utils'

export type RouterHandler<TRouter extends Router<any, any>> = (
  method: string | undefined,
  path: string,
  input: unknown,
  context: TRouter extends Router<infer UContext, any> ? UContext : never,
) => Promise<unknown>

export function createRouterHandler<
  TRouter extends Router<any, any> | DecoratedRouter<any>,
>(opts: {
  router: TRouter
  serverless?: boolean
  hooks?: (
    context: TRouter extends Router<infer UContext, any>
      ? UContext
      : TRouter extends DecoratedRouter<infer URouter>
        ? URouter extends Router<infer UContext, any>
          ? UContext
          : never
        : never,
    meta: Meta<unknown>,
  ) => Promisable<void>
}): RouterHandler<
  TRouter extends Router<any, any>
    ? TRouter
    : TRouter extends DecoratedRouter<infer URouter>
      ? URouter
      : never
> {
  const routing = opts.serverless
    ? new LinearRouter<[string[], WELL_DEFINED_PROCEDURE]>()
    : new RegExpRouter<[string[], WELL_DEFINED_PROCEDURE]>()

  const addRouteRecursively = (
    router: Router<any, any>,
    parentPath: string[],
  ) => {
    for (const key in router) {
      const currentPath = [...parentPath, key]
      const item = router[key] as WELL_DEFINED_PROCEDURE | Router<any, any>

      if (isProcedure(item)) {
        const method = item.__p.contract.__cp.method ?? 'POST'
        const path = item.__p.contract.__cp.path
          ? openAPIPathToRouterPath(item.__p.contract.__cp.path)
          : `/.${currentPath.join('.')}`

        routing.add(method, path, [currentPath, item])
      } else {
        addRouteRecursively(item, currentPath)
      }
    }
  }

  addRouteRecursively(opts.router as Router<any, any>, [])

  return async (method, path_, input_, context_) => {
    return await hook(async (hooks) => {
      let path: string[] | undefined
      let procedure: WELL_DEFINED_PROCEDURE | undefined
      let params: Record<string, string | number> | undefined

      if (!method) {
        const val = get(opts.router, path_)

        if (isProcedure(val)) {
          procedure = val
          path = path_.split('.')
        }
      } else {
        const [[match]] = routing.match(method, path_)
        path = match?.[0][0]
        procedure = match?.[0][1]
        params = match?.[1]
      }

      if (!path || !procedure) {
        throw new ORPCError({ code: 'NOT_FOUND' })
      }

      const meta: Meta<unknown> = {
        ...hooks,
        procedure,
        path: path.join('.'),
      }

      await opts.hooks?.(context_ as any, meta)

      const input =
        input_ === undefined && Object.keys(params ?? {}).length >= 1
          ? params
          : typeof input_ === 'object' && input_ !== null
            ? {
                ...params,
                ...input_,
              }
            : input_

      const validInput = (() => {
        const schema = procedure.__p.contract.__cp.InputSchema
        if (!schema) return input
        const result = schema.safeParse(input)
        if (result.error)
          throw new ORPCError({
            message: 'Validation input failed',
            code: 'BAD_REQUEST',
            cause: result.error,
          })
        return result.data
      })()

      let context = context_

      for (const middleware of procedure.__p.middlewares ?? []) {
        const mid = await middleware(validInput, context, meta)
        context = mergeContext(context, mid?.context)
      }

      const output = await procedure.__p.handler(validInput, context, meta)

      return (() => {
        const schema = procedure.__p.contract.__cp.OutputSchema
        if (!schema) return output
        const result = schema.safeParse(output)
        if (result.error)
          throw new ORPCError({
            message: 'Validation output failed',
            code: 'INTERNAL_SERVER_ERROR',
            cause: result.error,
          })
        return result.data
      })()
    })
  }
}

function openAPIPathToRouterPath(path: Exclude<HTTPPath, undefined>): string {
  return standardizeHTTPPath(path).replace(/\{([^}]+)\}/g, ':$1')
}
