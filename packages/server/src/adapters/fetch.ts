/// <reference lib="dom" />

import {
  type HTTPPath,
  ORPC_HEADER,
  ORPC_HEADER_VALUE,
  standardizeHTTPPath,
} from '@orpc/contract'
import {
  type PartialOnUndefinedDeep,
  get,
  isPlainObject,
  trim,
} from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import {
  ORPCDeserializer,
  ORPCSerializer,
  OpenAPIDeserializer,
  OpenAPISerializer,
} from '@orpc/transformer'
import { LinearRouter } from 'hono/router/linear-router'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { type WELL_DEFINED_PROCEDURE, isProcedure } from '../procedure'
import { createProcedureCaller } from '../procedure-caller'
import type { Router } from '../router'
import type { Meta, Promisable } from '../types'
import { hook } from '../utils'

export interface CreateFetchHandlerOptions<TRouter extends Router<any>> {
  router: TRouter

  hooks?: (
    context: TRouter extends Router<infer UContext> ? UContext : never,
    meta: Meta<unknown>,
  ) => Promisable<void>

  /**
   * It will help improve the cold start time. But it will increase the performance.
   *
   * @default false
   */
  serverless?: boolean
}

export function createFetchHandler<TRouter extends Router<any>>(
  options: CreateFetchHandlerOptions<TRouter>,
): FetchHandler<TRouter> {
  const routing = options.serverless
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

  addRouteRecursively(options.router, [])

  return async (requestOptions) => {
    const isORPCTransformer =
      requestOptions.request.headers.get(ORPC_HEADER) === ORPC_HEADER_VALUE
    const accept = requestOptions.request.headers.get('Accept') || undefined

    const serializer = isORPCTransformer
      ? new ORPCSerializer()
      : new OpenAPISerializer({ accept })

    try {
      return await hook(async (hooks) => {
        const url = new URL(requestOptions.request.url)
        const pathname = `/${trim(url.pathname.replace(requestOptions.prefix ?? '', ''), '/')}`

        let path: string[] | undefined
        let procedure: WELL_DEFINED_PROCEDURE | undefined
        let params: Record<string, string | number> | undefined

        if (isORPCTransformer) {
          path = trim(pathname, '/').split('/').map(decodeURIComponent)
          const val = get(options.router, path)

          if (isProcedure(val)) {
            procedure = val
          }
        } else {
          const [[match]] = routing.match(
            requestOptions.request.method,
            pathname,
          )
          path = match?.[0][0]
          procedure = match?.[0][1]
          params = match?.[1]

          if (!path || !procedure) {
            path = trim(pathname, '/').split('/').map(decodeURIComponent)

            const val = get(options.router, path)

            if (isProcedure(val)) {
              procedure = val
            }
          }
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

        await options.hooks?.(requestOptions.context as any, meta)

        const deserializer = isORPCTransformer
          ? new ORPCDeserializer()
          : new OpenAPIDeserializer({
              schema: procedure.zz$p.contract.zz$cp.InputSchema,
            })

        const input_ = await (async () => {
          try {
            return await deserializer.deserialize(requestOptions.request)
          } catch (e) {
            throw new ORPCError({
              code: 'BAD_REQUEST',
              message:
                'Cannot parse request. Please check the request body and Content-Type header.',
              cause: e,
            })
          }
        })()

        const input = (() => {
          if (
            params &&
            Object.keys(params).length > 0 &&
            (input_ === undefined || isPlainObject(input_))
          ) {
            return {
              ...params,
              ...input_,
            }
          }

          return input_
        })()

        const caller = createProcedureCaller({
          context: requestOptions.context,
          internal: false,
          validate: true,
          procedure,
          path,
        })

        const output = await caller(input)

        const { body, headers } = serializer.serialize(output)

        return new Response(body, {
          status: 200,
          headers,
        })
      })
    } catch (e) {
      const error = toORPCError(e)

      try {
        const { body, headers } = serializer.serialize(error.toJSON())

        return new Response(body, {
          status: error.status,
          headers: headers,
        })
      } catch (e) {
        const error = toORPCError(e)

        // fallback to OpenAPI serializer (without accept) when expected serializer has failed
        const { body, headers } = new OpenAPISerializer().serialize(
          error.toJSON(),
        )

        return new Response(body, {
          status: error.status,
          headers: headers,
        })
      }
    }
  }
}

function openAPIPathToRouterPath(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\{([^}]+)\}/g, ':$1')
}

export type FetchHandlerOptions<TRouter extends Router<any>> = {
  /**
   * The request need to be handled.
   */
  request: Request

  /**
   * Remove the prefix from the request path.
   *
   * @example /orpc
   * @example /api
   */
  prefix?: string
} & PartialOnUndefinedDeep<{
  /**
   * The context used to handle the request.
   */
  context: TRouter extends Router<infer UContext> ? UContext : never
}>

export interface FetchHandler<TRouter extends Router<any>> {
  (options: FetchHandlerOptions<TRouter>): Promise<Response>
}

function toORPCError(e: unknown): ORPCError<any, any> {
  return e instanceof ORPCError
    ? e
    : new ORPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        cause: e,
      })
}
