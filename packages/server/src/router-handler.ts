import { type HTTPPath, standardizeHTTPPath } from '@orpc/contract'
import { LinearRouter } from 'hono/router/linear-router'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { get } from 'radash'
import { ORPCError } from './error'
import { type WELL_DEFINED_PROCEDURE, isProcedure } from './procedure'
import type { Router, RouterWithContract } from './router'
import type { Context, Meta, Promisable } from './types'
import { hook, mergeContext } from './utils'

export interface RouterHandler<TContext extends Context> {
  (
    method: string | undefined,
    path: string,
    input: unknown,
    context: TContext,
  ): Promise<unknown>
}

export function createRouterHandler<TRouter extends Router<any>>(opts: {
  router: TRouter
  serverless?: boolean
  hooks?: (
    context: TRouter extends Router<infer UContext> ? UContext : never,
    meta: Meta<unknown>,
  ) => Promisable<void>
}): RouterHandler<TRouter extends Router<infer UContext> ? UContext : never> {
  const routing = opts.serverless
    ? new LinearRouter<[string[], WELL_DEFINED_PROCEDURE]>()
    : new RegExpRouter<[string[], WELL_DEFINED_PROCEDURE]>()

  const addRouteRecursively = (router: Router<any>, parentPath: string[]) => {
    for (const key in router) {
      const currentPath = [...parentPath, key]
      const item = router[key] as WELL_DEFINED_PROCEDURE | Router<any>

      if (isProcedure(item)) {
        const method = item.zz$p.contract.zz$cp.method ?? 'POST'
        const path = item.zz$p.contract.zz$cp.path
          ? openAPIPathToRouterPath(item.zz$p.contract.zz$cp.path)
          : `/.${currentPath.join('.')}`

        routing.add(method, path, [currentPath, item])
      } else {
        addRouteRecursively(item, currentPath)
      }
    }
  }

  addRouteRecursively(opts.router, [])

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

      await opts.hooks?.(context_, meta)

      const input =
        input_ === undefined && Object.keys(params ?? {}).length >= 1
          ? params
          : typeof input_ === 'object' &&
              input_ !== null &&
              !Array.isArray(input_)
            ? {
                ...params,
                ...input_,
              }
            : input_

      const validInput = await (async () => {
        const schema = procedure.zz$p.contract.zz$cp.InputSchema
        if (!schema) return input
        const result = await schema.safeParseAsync(input)
        if (result.error)
          throw new ORPCError({
            message: 'Validation input failed',
            code: 'BAD_REQUEST',
            cause: result.error,
          })
        return result.data
      })()

      let context = context_

      for (const middleware of procedure.zz$p.middlewares ?? []) {
        const mid = await middleware(validInput, context, meta)
        context = mergeContext(context, mid?.context)
      }

      const output = await procedure.zz$p.handler(validInput, context, meta)

      return await (async () => {
        const schema = procedure.zz$p.contract.zz$cp.OutputSchema
        if (!schema) return output
        const result = await schema.safeParseAsync(output)
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

function openAPIPathToRouterPath(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\{([^}]+)\}/g, ':$1')
}
