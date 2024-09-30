/// <reference lib="dom" />

import { HTTPMethod, HTTPPath } from '@orpc/contract'
import { trim } from 'radash'
import { ORPCError } from '../error'
import { Router } from '../router'
import { RouterHandler } from '../router-handler'
import { Meta, Promisable } from '../types'

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
    meta: Meta & { method: Exclude<HTTPMethod, undefined>; path: Exclude<HTTPPath, undefined> }
  ) => Promisable<{
    onError?: (error: unknown) => Promisable<void>
    onSuccess?: (output: unknown) => Promisable<void>
    onFinish?: (output: unknown | undefined, error: unknown | undefined) => Promisable<void>
  } | void>
}): Promise<Response> {
  try {
    const url = new URL(opts.request.url)
    const meta = {
      method: opts.request.method as Exclude<HTTPMethod, undefined>,
      path: `/${trim(url.pathname.replace(opts.prefix ?? '', ''), '/')}` as const,
    }
    const hooks = await opts.hooks?.(opts.context, meta)
    let ranOnFinish = false

    try {
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
            code: 'PARSE_ERROR',
            message: 'Invalid JSON was received by the server.',
            cause: e,
          })
        }
      })()

      const output = await opts.handler(input, opts.context, meta)

      const response = new Response(JSON.stringify(output), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      await hooks?.onSuccess?.(output)
      ranOnFinish = true
      await hooks?.onFinish?.(output, undefined)

      return response
    } catch (e) {
      let currentError = e

      try {
        await hooks?.onError?.(currentError)
      } catch (e) {
        currentError = e
      }

      if (!ranOnFinish) {
        await hooks?.onFinish?.(undefined, currentError)
      }

      throw currentError
    }
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
      }),
      {
        status: error.status,
      }
    )
  }
}
