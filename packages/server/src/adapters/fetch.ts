/// <reference lib="dom" />

import type {
  PartialOnUndefinedDeep,
  Promisable,
  Value,
} from '@orpc/shared'
import type { Procedure, WELL_DEFINED_PROCEDURE } from '../procedure'
import type { Router } from '../router'
import {
  ORPC_HEADER,
  ORPC_HEADER_VALUE,
} from '@orpc/contract'
import {
  isPlainObject,
  trim,
  value,
} from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import {
  OpenAPIDeserializer,
  OpenAPISerializer,
  ORPCDeserializer,
  ORPCSerializer,
  zodCoerce,
} from '@orpc/transformer'
import { isProcedure } from '../procedure'
import { createProcedureCaller } from '../procedure-caller'

export interface FetchHandlerHooks {
  next: () => Promise<Response>
  response: (response: Response) => Response
}

export type HandleFetchRequestOptions<TRouter extends Router<any>> = {
  /**
   * The router used to handle the request.
   */
  router: TRouter

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

  /**
   * Hooks for executing logics on lifecycle events.
   */
  hooks?: (
    context: TRouter extends Router<infer UContext> ? UContext : never,
    hooks: FetchHandlerHooks,
  ) => Promisable<Response>
} & PartialOnUndefinedDeep<{
  /**
   * The context used to handle the request.
   */
  context: Value<
    TRouter extends Router<infer UContext> ? UContext : never
  >
}>

export async function handleFetchRequest<TRouter extends Router<any>>(
  options: HandleFetchRequestOptions<TRouter>,
): Promise<Response> {
  const isORPCTransformer
      = options.request.headers.get(ORPC_HEADER) === ORPC_HEADER_VALUE
  const accept = options.request.headers.get('Accept') || undefined

  const serializer = isORPCTransformer
    ? new ORPCSerializer()
    : new OpenAPISerializer({ accept })

  const context = await value(options.context)

  const handler = async () => {
    const url = new URL(options.request.url)
    const pathname = `/${trim(url.pathname.replace(options.prefix ?? '', ''), '/')}`

    let path: string[] | undefined
    let procedure: WELL_DEFINED_PROCEDURE | undefined
    let params: Record<string, string> | undefined

    if (isORPCTransformer) {
      path = trim(pathname, '/').split('/').map(decodeURIComponent)

      let current: Router<any> | Procedure<any, any, any, any, any> | undefined = options.router
      for (const segment of path) {
        if ((typeof current !== 'object' || current === null) && typeof current !== 'function') {
          current = undefined
          break
        }

        current = (current as any)[segment]
      }

      if (isProcedure(current)) {
        procedure = current
      }
    }
    else {
      // TODO
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
        return await deserializer.deserialize(options.request)
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
      context,
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

function toORPCError(e: unknown): ORPCError<any, any> {
  return e instanceof ORPCError
    ? e
    : new ORPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      cause: e,
    })
}
