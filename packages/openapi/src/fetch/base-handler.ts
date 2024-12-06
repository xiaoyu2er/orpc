/// <reference lib="dom" />

import type { HTTPPath } from '@orpc/contract'
import type { ANY_LAZY_PROCEDURE, Procedure, Router, WELL_DEFINED_PROCEDURE } from '@orpc/server'
import type { FetchHandler } from '@orpc/server/fetch'
import type { Router as HonoRouter } from 'hono/router'
import { ORPC_HEADER, standardizeHTTPPath } from '@orpc/contract'
import { createProcedureCaller, isLazy, isProcedure, LAZY_LOADER_SYMBOL, LAZY_ROUTER_PREFIX_SYMBOL, ORPCError } from '@orpc/server'
import { isPlainObject, mapValues, trim, value } from '@orpc/shared'
import { OpenAPIDeserializer, OpenAPISerializer, zodCoerce } from '@orpc/transformer'

export type ResolveRouter = (router: Router<any>, method: string, pathname: string) => Promise<{
  path: string[]
  procedure: Procedure<any, any, any, any, any>
  params: Record<string, string>
} | undefined>

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
      const customMethod
        = options.request.method === 'POST'
          ? url.searchParams.get('method')?.toUpperCase()
          : undefined
      const method = customMethod || options.request.method

      const match = await resolveRouter(options.router, method, pathname)

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
type Pending = { ref: [string, string | undefined, () => Promise<void>][] }
const routingCache = new Map<Router<any>, Routing>()
const pendingCache = new Map<Router<any>, Pending>()

export function createResolveRouter(createHonoRouter: () => Routing): ResolveRouter {
  const addRouteRecursively = (routing: Routing, pending: Pending, routerOrChild: WELL_DEFINED_PROCEDURE | Router<any> | ANY_LAZY_PROCEDURE, currentPath: string[]) => {
    if (isProcedure(routerOrChild)) {
      const method = routerOrChild.zz$p.contract.zz$cp.method ?? 'POST'
      const path = routerOrChild.zz$p.contract.zz$cp.path
        ? openAPIPathToRouterPath(routerOrChild.zz$p.contract.zz$cp.path)
        : `/${currentPath.map(encodeURIComponent).join('/')}`

      routing.add(method, path, [currentPath, routerOrChild])
    }
    else if (isLazy(routerOrChild)) {
      pending.ref.push([
        `/${currentPath.map(encodeURIComponent).join('/')}`,
        (routerOrChild as any)[LAZY_ROUTER_PREFIX_SYMBOL],
        async () => addRouteRecursively(routing, pending, (await routerOrChild[LAZY_LOADER_SYMBOL]() as any).default, currentPath),
      ])
    }
    else {
      for (const key in routerOrChild) {
        addRouteRecursively(routing, pending, (routerOrChild as any)[key], [...currentPath, key])
      }
    }
  }

  return async (router: Router<any>, method: string, pathname: string) => {
    const pending = (() => {
      let pending = pendingCache.get(router)
      if (!pending) {
        pending = { ref: [] }
        pendingCache.set(router, pending)
      }

      return pending
    })()

    const routing = (() => {
      let routing = routingCache.get(router)

      if (routing) {
        return routing
      }

      routing = createHonoRouter()
      routingCache.set(router, routing)

      addRouteRecursively(routing, pending, router, [])

      return routing
    })()

    const newPending = []

    for (const value of pending.ref) {
      if (pathname.startsWith(value[0]) || !value[1] || pathname.startsWith(value[1])) {
        await value[2]()
      }
      else {
        newPending.push(value)
      }
    }

    pending.ref = newPending

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
