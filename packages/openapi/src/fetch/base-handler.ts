/// <reference lib="dom" />

import type { HTTPPath } from '@orpc/contract'
import type { ANY_PROCEDURE, ANY_ROUTER } from '@orpc/server'
import type { FetchHandler } from '@orpc/server/fetch'
import type { Router as HonoRouter } from 'hono/router'
import type { EachContractLeafResultItem, EachLeafOptions } from '../utils'
import { createProcedureClient, getLazyRouterPrefix, getRouterChild, isProcedure, LAZY_LOADER_SYMBOL, ORPCError, unlazy } from '@orpc/server'
import { executeWithHooks, isPlainObject, mapValues, ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE, trim, value } from '@orpc/shared'
import { OpenAPIDeserializer, OpenAPISerializer, zodCoerce } from '@orpc/transformer'
import { forEachContractProcedure, standardizeHTTPPath } from '../utils'

export type ResolveRouter = (router: ANY_ROUTER, method: string, pathname: string) => Promise<{
  path: string[]
  procedure: ANY_PROCEDURE
  params: Record<string, string>
} | undefined>

type Routing = HonoRouter<string[]>

export function createOpenAPIHandler(createHonoRouter: () => Routing): FetchHandler {
  const resolveRouter = createResolveRouter(createHonoRouter)

  return async (options) => {
    if (options.request.headers.get(ORPC_HANDLER_HEADER)?.includes(ORPC_HANDLER_VALUE)) {
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

      const { path, procedure } = match

      const params = procedure['~orpc'].contract['~orpc'].InputSchema
        ? zodCoerce(
          procedure['~orpc'].contract['~orpc'].InputSchema,
          match.params,
          { bracketNotation: true },
        ) as Record<string, unknown>
        : match.params

      const input = await deserializeInput(options.request, procedure)
      const mergedInput = mergeParamsAndInput(params, input)

      const caller = createProcedureClient({
        context,
        procedure,
        path,
      })

      const output = await caller(mergedInput, { signal: options.signal })

      const { body, headers } = serializer.serialize(output)

      return new Response(body, {
        status: 200,
        headers,
      })
    }

    try {
      return await executeWithHooks({
        context: context as any,
        hooks: options,
        execute: handler,
        input: options.request,
        meta: {
          signal: options.signal,
        },
      })
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

const routingCache = new Map<ANY_ROUTER, Routing>()
const pendingCache = new Map<ANY_ROUTER, { ref: EachContractLeafResultItem[] }> ()

export function createResolveRouter(createHonoRouter: () => Routing): ResolveRouter {
  const addRoutes = (routing: Routing, pending: { ref: EachContractLeafResultItem[] }, options: EachLeafOptions) => {
    const lazies = forEachContractProcedure(options, ({ path, contract }) => {
      const method = contract['~orpc'].route?.method ?? 'POST'
      const httpPath = contract['~orpc'].route?.path
        ? openAPIPathToRouterPath(contract['~orpc'].route?.path)
        : `/${path.map(encodeURIComponent).join('/')}`

      routing.add(method, httpPath, path)
    })

    pending.ref.push(...lazies)
  }

  return async (router: ANY_ROUTER, method: string, pathname: string) => {
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
      const lazyPrefix = getLazyRouterPrefix(item.router)

      if (
        lazyPrefix
        && !pathname.startsWith(lazyPrefix)
        && !pathname.startsWith(`/${item.path.map(encodeURIComponent).join('/')}`)
      ) {
        newPending.push(item)
        continue
      }

      const router = (await item.router[LAZY_LOADER_SYMBOL]()).default

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

    const { default: maybeProcedure } = await unlazy(getRouterChild(router, ...path))

    if (!isProcedure(maybeProcedure)) {
      return undefined
    }

    return {
      path,
      procedure: maybeProcedure,
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

async function deserializeInput(request: Request, procedure: ANY_PROCEDURE): Promise<unknown> {
  const deserializer = new OpenAPIDeserializer({
    schema: procedure['~orpc'].contract['~orpc'].InputSchema,
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

function openAPIPathToRouterPath(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\{([^}]+)\}/g, ':$1')
}
