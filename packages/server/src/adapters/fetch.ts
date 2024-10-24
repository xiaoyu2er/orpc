/// <reference lib="dom" />

import {
  packIntoRequestResponseInit,
  unpackFromRequestResponse,
} from '@orpc/transformer'
import { trim } from 'radash'
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
}

export async function fetchHandler<THandler extends RouterHandler<any>>(
  opts: FetchHandlerOptions<THandler>,
): Promise<Response> {
  try {
    const response = await hook<Response>(async (hooks) => {
      const url = new URL(opts.request.url)
      const pathname = `/${trim(url.pathname.replace(opts.prefix ?? '', ''), '/')}`

      const way = (() => {
        if (pathname.startsWith('/.')) {
          return trim(pathname.replace('.', ''), '/').split('.')
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

        return await unpackFromRequestResponse(opts.request)
      })()

      const output = await opts.handler(way, input, opts.context)

      const { body, headers } = packIntoRequestResponseInit(output)

      return new Response(body, {
        status: 200,
        headers: headers,
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

    const { body, headers } = packIntoRequestResponseInit(error.toJSON())

    return new Response(body, {
      status: error.status,
      headers: headers,
    })
  }
}
