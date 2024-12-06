/// <reference lib="dom" />

import type { HTTPPath } from '@orpc/contract'
import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE, Router } from '@orpc/server'
import type { FetchHandler } from '@orpc/server/fetch'
import type { Router as HonoRouter } from 'hono/router'
import type { EachContractLeafResultItem, EachLeafOptions } from '../utils'
import { ORPC_HEADER, standardizeHTTPPath } from '@orpc/contract'
import { createProcedureCaller, isLazy, isProcedure, LAZY_LOADER_SYMBOL, LAZY_ROUTER_PREFIX_SYMBOL, ORPCError } from '@orpc/server'
import { isPlainObject, mapValues, trim, value } from '@orpc/shared'
import { OpenAPIDeserializer, OpenAPISerializer, zodCoerce } from '@orpc/transformer'
import { eachContractProcedureLeaf } from '../utils'

export type ResolveRouter = (router: Router<any>, method: string, pathname: string) => Promise<{
  path: string[]
  procedure: ANY_PROCEDURE | ANY_LAZY_PROCEDURE
  params: Record<string, string>
} | undefined>

type Routing = HonoRouter<string[]>

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
      const procedure = isLazy(match.procedure) ? (await match.procedure[LAZY_LOADER_SYMBOL]()).default : match.procedure
      const path = match.path

      if (!isProcedure(procedure)) {
        throw new ORPCError({
          code: 'NOT_FOUND',
          message: 'Not found',
        })
      }

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

const routingCache = new Map<Router<any>, Routing>()
const pendingCache = new Map<Router<any>, { ref: EachContractLeafResultItem[] }> ()

export function createResolveRouter(createHonoRouter: () => Routing): ResolveRouter {
  const addRoutes = (routing: Routing, pending: { ref: EachContractLeafResultItem[] }, options: EachLeafOptions) => {
    const lazies = eachContractProcedureLeaf(options, ({ path, contract }) => {
      const method = contract.zz$cp.method ?? 'POST'
      const httpPath = contract.zz$cp.path
        ? openAPIPathToRouterPath(contract.zz$cp.path)
        : `/${path.map(encodeURIComponent).join('/')}`

      routing.add(method, httpPath, path)
    })

    pending.ref.push(...lazies)
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

      if (!routing) {
        routing = createHonoRouter()
        routingCache.set(router, routing)
        addRoutes(routing, pending, { router, path: [] })
      }

      return routing
    })()

    const newPending = []

    for (const item of pending.ref) {
      if (
        (LAZY_ROUTER_PREFIX_SYMBOL in item.lazy)
        && item.lazy[LAZY_ROUTER_PREFIX_SYMBOL]
        && !pathname.startsWith(item.lazy[LAZY_ROUTER_PREFIX_SYMBOL] as HTTPPath)
        && !pathname.startsWith(`/${item.path.map(encodeURIComponent).join('/')}`)
      ) {
        newPending.push(item)
        continue
      }

      const router = (await item.lazy[LAZY_LOADER_SYMBOL]()).default

      addRoutes(routing, pending, { path: item.path, router })
    }

    pending.ref = newPending

    const [matches, params_] = routing.match(method, pathname)

    const [match] = matches.sort((a, b) => {
      return Object.keys(a[1]).length - Object.keys(b[1]).length
    })

    if (!match) {
      return undefined
    }

    const path = match[0]
    const params = params_
      ? mapValues(
        (match as any)[1]!,
        v => params_[v as number]!,
      )
      : match[1] as Record<string, string>

    let current: Router<any> | ANY_PROCEDURE | ANY_LAZY_PROCEDURE | undefined = router
    for (const segment of path) {
      if ((typeof current !== 'object' && typeof current !== 'function') || !current) {
        current = undefined
        break
      }

      current = (current as any)[segment]
    }

    return isProcedure(current) || isLazy(current)
      ? {
          path,
          procedure: current,
          params: { ...params }, // params from hono not a normal object, so we need spread here
        }
      : undefined
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

async function deserializeInput(request: Request, procedure: ANY_PROCEDURE): Promise<unknown> {
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
