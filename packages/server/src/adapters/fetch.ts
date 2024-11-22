/// <reference lib="dom" />

import type {
  PartialOnUndefinedDeep,
  Promisable,
} from '@orpc/shared'
import type { Router } from '../router'
import {
  type HTTPPath,
  ORPC_HEADER,
  ORPC_HEADER_VALUE,
  standardizeHTTPPath,
} from '@orpc/contract'
import {
  get,
  isPlainObject,
  mapValues,
  trim,
} from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import {
  OpenAPIDeserializer,
  OpenAPISerializer,
  ORPCDeserializer,
  ORPCSerializer,
  zodCoerce,
} from '@orpc/transformer'
import { LinearRouter } from 'hono/router/linear-router'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { isProcedure, type WELL_DEFINED_PROCEDURE } from '../procedure'
import { createProcedureCaller } from '../procedure-caller'

export interface FetchHandlerHooks {
  next: () => Promise<Response>
  response: (response: Response) => Response
}

export interface CreateFetchHandlerOptions<TRouter extends Router<any>> {
  router: TRouter

  /**
   * Hooks for executing logics on lifecycle events.
   */
  hooks?: (
    context: TRouter extends Router<infer UContext> ? UContext : never,
    hooks: FetchHandlerHooks,
  ) => Promisable<Response>

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
      }
      else {
        addRouteRecursively(item, currentPath)
      }
    }
  }

  addRouteRecursively(options.router, [])

  return async (requestOptions) => {
    const isORPCTransformer
      = requestOptions.request.headers.get(ORPC_HEADER) === ORPC_HEADER_VALUE
    const accept = requestOptions.request.headers.get('Accept') || undefined

    const serializer = isORPCTransformer
      ? new ORPCSerializer()
      : new OpenAPISerializer({ accept })

    const handler = async () => {
      const url = new URL(requestOptions.request.url)
      const pathname = `/${trim(url.pathname.replace(requestOptions.prefix ?? '', ''), '/')}`

      let path: string[] | undefined
      let procedure: WELL_DEFINED_PROCEDURE | undefined
      let params: Record<string, string> | undefined

      if (isORPCTransformer) {
        path = trim(pathname, '/').split('/').map(decodeURIComponent)
        const val = get(options.router, path)

        if (isProcedure(val)) {
          procedure = val
        }
      }
      else {
        const customMethod
            = requestOptions.request.method === 'POST'
              ? url.searchParams.get('method')?.toUpperCase()
              : undefined
        const method = customMethod || requestOptions.request.method

        const [matches, params_] = routing.match(method, pathname)

        const [match] = matches.sort((a, b) => {
          return Object.keys(a[1]).length - Object.keys(b[1]).length
        })

        if (match) {
          path = match[0][0]
          procedure = match[0][1]

          if (params_) {
            params = mapValues(
              (match as any)[1]!,
              v => params_[v as number]!,
            )
          }
          else {
            params = match[1] as Record<string, string>
          }
        }

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

      const deserializer = isORPCTransformer
        ? new ORPCDeserializer()
        : new OpenAPIDeserializer({
          schema: procedure.zz$p.contract.zz$cp.InputSchema,
        })

      const input_ = await (async () => {
        try {
          return await deserializer.deserialize(requestOptions.request)
        }
        catch (e) {
          throw new ORPCError({
            code: 'BAD_REQUEST',
            message:
                'Cannot parse request. Please check the request body and Content-Type header.',
            cause: e,
          })
        }
      })()

      const input = (() => {
        if (!params || Object.keys(params).length === 0) {
          return input_
        }

        const coercedParams = procedure.zz$p.contract.zz$cp.InputSchema
          ? (zodCoerce(
              procedure.zz$p.contract.zz$cp.InputSchema,
              { ...params },
              {
                bracketNotation: true,
              },
            ) as object)
          : params

        if (!isPlainObject(input_)) {
          return coercedParams
        }

        return {
          ...coercedParams,
          ...input_,
        }
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
    }

    try {
      return await options.hooks?.(requestOptions.context as any, {
        next: handler,
        response: response => response,
      }) ?? await handler()
    }
    catch (e) {
      const error = toORPCError(e)

      try {
        const { body, headers } = serializer.serialize(error.toJSON())

        return new Response(body, {
          status: error.status,
          headers,
        })
      }
      catch (e) {
        const error = toORPCError(e)

        // fallback to OpenAPI serializer (without accept) when expected serializer has failed
        const { body, headers } = new OpenAPISerializer().serialize(
          error.toJSON(),
        )

        return new Response(body, {
          status: error.status,
          headers,
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
