import type { MaybeOptionalOptions, Value } from '@orpc/shared'
import type { NextRequest } from 'next/server'
import type { Context } from '../../context'
import type { FetchHandler } from '../fetch'
import type { StandardHandleOptions } from '../standard'
import { resolveMaybeOptionalOptions, value } from '@orpc/shared'

export type ServeOptions<T extends Context> =
  & Omit<StandardHandleOptions<T>, 'context'>
  & (Record<never, never> extends T ? { context?: Value<T, [NextRequest]> } : { context: Value<T, [NextRequest]> })

export interface ServeResult {
  GET(req: NextRequest): Promise<Response>
  POST(req: NextRequest): Promise<Response>
  PUT(req: NextRequest): Promise<Response>
  PATCH(req: NextRequest): Promise<Response>
  DELETE(req: NextRequest): Promise<Response>
}

export function serve<T extends Context>(
  handler: FetchHandler<T>,
  ...rest: MaybeOptionalOptions<ServeOptions<T>>
): ServeResult {
  const options = resolveMaybeOptionalOptions(rest)

  const main = async (req: NextRequest) => {
    const context = await value(options.context ?? {} as T, req)

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
