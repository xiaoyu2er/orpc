/// <reference lib="dom" />

import { trim } from 'radash'
import { ORPC_INTERNAL_HEADER } from '../config'
import { ORPCError } from '../error'
import type { Router } from '../router'
import type { RouterHandler } from '../router-handler'
import type { Hooks, Promisable } from '../types'
import { hook } from '../utils'

export async function fetchHandler<THandler extends RouterHandler<any>>(opts: {
  request: Request
  prefix?: string
  handler: THandler
  context: THandler extends RouterHandler<infer URouter>
    ? URouter extends Router<infer UContext, any>
      ? UContext
      : never
    : never
  hooks?: (
    context: THandler extends RouterHandler<infer URouter>
      ? URouter extends Router<infer UContext, any>
        ? UContext
        : never
      : never,
    hooks: Hooks<Response>,
  ) => Promisable<void>
}): Promise<Response> {
  try {
    const response = await hook<Response>(async (hooks) => {
      const url = new URL(opts.request.url)

      const { path, method } = (() => {
        if (opts.request.headers.get(ORPC_INTERNAL_HEADER) === '1') {
          return {
            path: trim(url.pathname.replace(opts.prefix ?? '', ''), '/'),
          }
        }

        return {
          method: opts.request.method,
          path: `/${trim(url.pathname.replace(opts.prefix ?? '', ''), '/')}`,
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
          return JSON.parse(text)
        } catch (e) {
          throw new ORPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid JSON was received by the server.',
            cause: e,
          })
        }
      })()

      const output = await opts.handler(method, path, input, opts.context)

      return new Response(JSON.stringify(output), {
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

    return new Response(
      JSON.stringify({
        code: error.code,
        status: error.status,
        message: error.message,
        data: error.data,
        issues: error.issues,
      }),
      {
        status: error.status,
      },
    )
  }
}
