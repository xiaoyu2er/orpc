import { type HTTPPath, standardizeHTTPPath } from '@orpc/contract'
import { LinearRouter } from 'hono/router/linear-router'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { isObject } from 'radash'
import { ORPCError } from './error'
import { type WELL_DEFINED_PROCEDURE, isProcedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'
import type { Router } from './router'
import type { Context, Meta, Promisable } from './types'
import { get, hook } from './utils'

export interface RouterHandler<TContext extends Context> {
  (
    way: { method: string; path: string } | string[],
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

  const addRouteRecursively = (router: Router<any>, basePath: string[]) => {
    for (const key in router) {
      const currentPath = [...basePath, key]
      const item = router[key] as WELL_DEFINED_PROCEDURE | Router<any>

      if (isProcedure(item)) {
        if (item.zz$p.contract.zz$cp.path) {
          const method = item.zz$p.contract.zz$cp.method ?? 'POST'
          const path = openAPIPathToRouterPath(item.zz$p.contract.zz$cp.path)

          routing.add(method, path, [currentPath, item])
        }
      } else {
        addRouteRecursively(item, currentPath)
      }
    }
  }

  addRouteRecursively(opts.router, [])

  return async (way, input_, context_) => {
    return await hook(async (hooks) => {
      let path: string[] | undefined
      let procedure: WELL_DEFINED_PROCEDURE | undefined
      let params: Record<string, string | number> | undefined

      if (Array.isArray(way)) {
        const val = get(opts.router, way)

        if (isProcedure(val)) {
          procedure = val
          path = way
        }
      } else {
        const [[match]] = routing.match(way.method, way.path)
        path = match?.[0][0]
        procedure = match?.[0][1]
        params = match?.[1]
      }

      if (!path || !procedure) {
        throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
      }

      const meta: Meta<unknown> = {
        ...hooks,
        procedure,
        path: path,
        internal: false,
      }

      await opts.hooks?.(context_, meta)

      const input = (() => {
        if (
          params &&
          Object.keys(params).length > 0 &&
          (input_ === undefined || isObject(input_))
        ) {
          return {
            ...params,
            ...input_,
          }
        }

        return input_
      })()

      const caller = createProcedureCaller({
        procedure: procedure,
        context: context_,
        internal: false,
        validate: true,
        path: path,
      })

      return await caller(input)
    })
  }
}

function openAPIPathToRouterPath(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\{([^}]+)\}/g, ':$1')
}
