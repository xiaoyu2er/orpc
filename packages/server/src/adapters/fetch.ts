/// <reference lib="dom" />

import { ORPC_TRANSFORMER_HEADER, type Transformer } from '@orpc/contract'
import { trim } from 'radash'
import SuperJSON from 'superjson'
import { ORPCError } from '../error'
import type { RouterHandler } from '../router-handler'
import type { Hooks, Promisable } from '../types'
import { hook } from '../utils'

export interface FetchHandlerOptions<THandler extends RouterHandler<any>> {
  /**
   * The request need to be handled.
   */
  request: Request

  /**
   * Prefix pathname.
   *
   * @example /orpc
   * @example /api
   */
  prefix?: string

  /**
   * Router handler. use `createRouterHandler` to create it.
   */
  handler: THandler

  /**
   * The context used to handle the request.
   */
  context: THandler extends RouterHandler<infer UContext> ? UContext : never

  /**
   * Hooks help you listen to the request lifecycle.
   * Helpful when you want to log, analyze, ...
   */
  hooks?: (
    context: THandler extends RouterHandler<infer UContext> ? UContext : never,
    hooks: Hooks<Response>,
  ) => Promisable<void>

  /**
   * The transformer used to support more data types of the request and response.
   * It's only used when x-orpc-transformer=1 is set in the request header.
   *
   * @default SuperJSON
   */
  transformer?: Transformer
}

export async function fetchHandler<THandler extends RouterHandler<any>>(
  opts: FetchHandlerOptions<THandler>,
): Promise<Response> {
  const transformer: Transformer = (() => {
    if (opts.request.headers.get(ORPC_TRANSFORMER_HEADER) !== '1') {
      return JSON
    }

    return opts.transformer ?? SuperJSON
  })()

  try {
    const response = await hook<Response>(async (hooks) => {
      const url = new URL(opts.request.url)
      const pathname = `/${trim(url.pathname.replace(opts.prefix ?? '', ''), '/')}`

      const { path, method } = (() => {
        if (pathname.startsWith('/.')) {
          return {
            path: trim(pathname, '/.'),
          }
        }

        return {
          method: opts.request.method,
          path: pathname,
        }
      })()

      await opts.hooks?.(opts.context, hooks)

      const input = await (async () => {
        if (opts.request.method === 'GET') {
          return { ...url.searchParams }
        }

        const text = await opts.request.text()
        if (text === '') return undefined

        try {
          return transformer.parse(text)
        } catch (e) {
          throw new ORPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid JSON was received by the server.',
            cause: e,
          })
        }
      })()

      const output = await opts.handler(method, path, input, opts.context)

      return new Response(transformer.stringify(output), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    return response
  } catch (e) {
    const error =
      e instanceof ORPCError
        ? e
        : new ORPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
            cause: e,
          })

    return new Response(transformer.stringify(error.toJSON()), {
      status: error.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
