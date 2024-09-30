import { HTTPPath, standardizeHTTPPath } from '@orpc/contract'
import { LinearRouter } from 'hono/router/linear-router'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { get } from 'radash'
import { ORPCError } from './error'
import { isProcedure, WELL_DEFINED_PROCEDURE } from './procedure'
import { DecoratedRouter, Router } from './router'
import { Meta } from './types'
import { mergeContext, mergeMiddlewares } from './utils'

export interface RouterHandler<TRouter extends Router<any, any>> {
  (
    input: unknown,
    context: TRouter extends Router<infer UContext, any> ? UContext : never,
    meta: Meta & {
      path: Exclude<HTTPPath, undefined>
    },
    opts?: {
      internal?: boolean
    }
  ): Promise<unknown>
}

export function createRouterHandler<TRouter extends Router<any, any> | DecoratedRouter<any>>(opts: {
  router: TRouter
  serverless?: boolean
}): RouterHandler<
  TRouter extends Router<any, any>
    ? TRouter
    : TRouter extends DecoratedRouter<infer URouter>
    ? URouter
    : never
> {
  const routing = opts.serverless
    ? new LinearRouter<WELL_DEFINED_PROCEDURE>()
    : new RegExpRouter<WELL_DEFINED_PROCEDURE>()

  const addRouteRecursively = (
    router: Router<any, any>,
    parentFallbackPath: Exclude<HTTPPath, undefined>
  ) => {
    for (const key in router) {
      const fallbackPath = `${parentFallbackPath}.${key}` as const
      const item = router[key] as WELL_DEFINED_PROCEDURE | Router<any, any>

      if (isProcedure(item)) {
        const method = item.__p.contract.__cp.method ?? 'POST'
        const path = item.__p.contract.__cp.path ?? fallbackPath

        routing.add(method, openAPIPathToRouterPath(path), item)
      } else {
        addRouteRecursively(item, fallbackPath)
      }
    }
  }

  addRouteRecursively(opts.router as any, '/')

  return async (input_, context, meta, opts_) => {
    let procedure: WELL_DEFINED_PROCEDURE | undefined
    let params: Record<string, string | number> | undefined

    if (opts_?.internal && meta.path) {
      procedure = get(opts.router, meta.path.replace('/.', ''))

      if (!isProcedure(procedure)) {
        procedure = undefined
      }
    } else if (meta.path) {
      const [[match]] = routing.match(meta.method ?? 'POST', meta.path)
      procedure = match?.[0]
      params = match?.[1]
    }

    if (!procedure) {
      throw new ORPCError({ code: 'NOT_FOUND' })
    }

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

    const middleware = mergeMiddlewares(...(procedure.__p.middlewares ?? []))

    let ranOnFinish = false
    const midResult = await middleware(validInput, context, meta)

    try {
      const output = await procedure.__p.handler(
        validInput,
        mergeContext(context, midResult?.context),
        meta
      )

      const validOutput = (() => {
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

      await midResult?.onSuccess?.(validOutput)
      ranOnFinish = true
      await midResult?.onFinish?.(validOutput, undefined)

      return validOutput
    } catch (e) {
      let currentError = e

      try {
        await midResult?.onError?.(currentError)
      } catch (e) {
        currentError = e
      }

      if (!ranOnFinish) {
        await midResult?.onFinish?.(undefined, currentError)
      }

      throw currentError
    }
  }
}

function openAPIPathToRouterPath(path: Exclude<HTTPPath, undefined>): string {
  return standardizeHTTPPath(path).replace(/\{([^}]+)\}/g, ':$1')
}
