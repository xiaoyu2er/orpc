import type { Context as HonoContext, MiddlewareHandler } from 'hono'
import type { Context } from '../../context'
import type { FetchHandler } from '../fetch'
import type { StandardHandleOptions } from '../standard'
import { value, type Value } from '@orpc/shared'

export type CreateMiddlewareOptions<T extends Context> =
  & Omit<StandardHandleOptions<T>, 'context'>
  & (Record<never, never> extends T ? { context?: Value<T, [HonoContext]> } : { context: Value<T, [HonoContext]> })

export type CreateMiddlewareRest<T extends Context> =
  | [options: CreateMiddlewareOptions<T>]
  | (Record<never, never> extends T ? [] : never)

export function createMiddleware<T extends Context>(handler: FetchHandler<T>, ...[options]: CreateMiddlewareRest<T>): MiddlewareHandler {
  return async (c, next) => {
    const context = await value(options?.context ?? {}, c) as any

    const { matched, response } = await handler.handle(c.req.raw, { ...options, context })

    if (matched) {
      return c.body(response.body, response)
    }

    await next()
  }
}
