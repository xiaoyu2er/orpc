import type { NextRequest } from 'next/server'
import type { Context } from '../../types'
import type { FetchHandleOptions, FetchHandler } from '../fetch'
import { value, type Value } from '@orpc/shared'

export type ServeOptions<T extends Context> =
  & Omit<FetchHandleOptions<T>, 'context'>
  & (undefined extends T ? { context?: Value<T, [NextRequest]> } : { context: Value<T, [NextRequest]> })

export type ServeRest<T extends Context> = [options: ServeOptions<T>] | (undefined extends T ? [] : never)

export interface ServeResult {
  GET: (req: NextRequest) => Promise<Response>
  POST: (req: NextRequest) => Promise<Response>
  PUT: (req: NextRequest) => Promise<Response>
  PATCH: (req: NextRequest) => Promise<Response>
  DELETE: (req: NextRequest) => Promise<Response>
}

export function serve<T extends Context>(handler: FetchHandler<T>, ...[options]: ServeRest<T>): ServeResult {
  const main = async (req: NextRequest) => {
    const context = await value(options?.context, req) as any

    const { matched, response } = await handler.handle(req, { ...options, context })

    if (matched) {
      return response
    }

    return new Response(`Cannot find a matching procedure for ${req.url}`, { status: 404 })
  }

  return {
    GET: main,
    POST: main,
    PUT: main,
    PATCH: main,
    DELETE: main,
  }
}
