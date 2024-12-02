import type { HTTPPath } from '@orpc/contract'
import type { FetchHandler } from '@orpc/server/fetch'
import type { Router as HonoRouter } from 'hono/router'
import { ORPC_HEADER, standardizeHTTPPath } from '@orpc/contract'
import { createProcedureCaller, isProcedure, ORPCError, type Procedure, type Router, type WELL_DEFINED_PROCEDURE } from '@orpc/server'
import { isPlainObject, mapValues, trim, value } from '@orpc/shared'
import { OpenAPIDeserializer, OpenAPISerializer, zodCoerce } from '@orpc/transformer'

export type ResolveRouter = (router: Router<any>, method: string, pathname: string) => {
  path: string[]
  procedure: Procedure<any, any, any, any, any>
  params: Record<string, string>
} | undefined

type Routing = HonoRouter<[string[], Procedure<any, any, any, any, any>]>

export function createOpenAPIHandler(createHonoRouter: () => Routing): FetchHandler {
  const resolveRouter = createResolveRouter(createHonoRouter)

  return async (options) => {
    if (options.request.headers.get(ORPC_HEADER) !== null) {
      return undefined
    }

    const context = await value(options.context)
    const accept = options.request.headers.get('Accept') || undefined
    const serializer = new OpenAPISerializer({ accept })

    const handler = async () => {
      const url = new URL(options.request.url)
      const pathname = `/${trim(url.pathname.replace(options.prefix ?? '', ''), '/')}`

      const match = resolveRouter(options.router, options.request.method, pathname)

      if (!match) {
        throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
      }
      const procedure = match.procedure
      const path = match.path

      const params = procedure.zz$p.contract.zz$cp.InputSchema
        ? zodCoerce(
          procedure.zz$p.contract.zz$cp.InputSchema,
          match.params,
          { bracketNotation: true },
        ) as Record<string, unknown>
        : match.params

      const input = await deserializeInput(options.request, procedure)
      const mergedInput = mergeParamsAndInput(params, input)

      const caller = createProcedureCaller({
        context,
        procedure,
        path,
      })

      const output = await caller(mergedInput)

      const { body, headers } = serializer.serialize(output)

      return new Response(body, {
        status: 200,
        headers,
      })
    }

    try {
      return await options.hooks?.(context as any, {
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

export function createResolveRouter(createHonoRouter: () => Routing): ResolveRouter {
  const routingCache = new Map<Router<any>, Routing>()

  return (router: Router<any>, method: string, pathname: string) => {
    let routing = routingCache.get(router)

    if (!routing) {
      routing = createHonoRouter()

      const addRouteRecursively = (routing: Routing, router: Router<any>, basePath: string[]) => {
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
            addRouteRecursively(routing, item, currentPath)
          }
        }
      }

      addRouteRecursively(routing, router, [])
      routingCache.set(router, routing)
    }

    const [matches, params_] = routing.match(method, pathname)

    const [match] = matches.sort((a, b) => {
      return Object.keys(a[1]).length - Object.keys(b[1]).length
    })

    if (!match) {
      return undefined
    }

    const path = match[0][0]
    const procedure = match[0][1]
    const params = params_
      ? mapValues(
        (match as any)[1]!,
        v => params_[v as number]!,
      )
      : match[1] as Record<string, string>

    return {
      path,
      procedure,
      params: { ...params }, // params from hono not a normal object, so we need spread here
    }
  }
}

function mergeParamsAndInput(coercedParams: Record<string, unknown>, input: unknown) {
  if (Object.keys(coercedParams).length === 0) {
    return input
  }

  if (!isPlainObject(input)) {
    return coercedParams
  }

  return {
    ...coercedParams,
    ...input,
  }
}

async function deserializeInput(request: Request, procedure: Procedure<any, any, any, any, any>): Promise<unknown> {
  const deserializer = new OpenAPIDeserializer({
    schema: procedure.zz$p.contract.zz$cp.InputSchema,
  })

  try {
    return await deserializer.deserialize(request)
  }
  catch (e) {
    throw new ORPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot parse request. Please check the request body and Content-Type header.',
      cause: e,
    })
  }
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

export function openAPIPathToRouterPath(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\{([^}]+)\}/g, ':$1')
}
