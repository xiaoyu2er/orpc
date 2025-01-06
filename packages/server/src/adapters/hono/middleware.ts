import type { Context as HonoContext, MiddlewareHandler } from 'hono'
import type { Context } from '../../types'
import type { FetchHandleOptions, FetchHandler } from '../fetch'
import { value, type Value } from '@orpc/shared'

export type CreateMiddlewareOptions<T extends Context> =
  & Omit<FetchHandleOptions<T>, 'context'>
  & (undefined extends T ? { context?: Value<T, [HonoContext]> } : { context: Value<T, [HonoContext]> })

export type CreateMiddlewareRest<T extends Context> = [options: FetchHandleOptions<T>] | (undefined extends T ? [] : never)

export function createMiddleware<T extends Context>(handler: FetchHandler<T>, ...[options]: CreateMiddlewareRest<T>): MiddlewareHandler {
  return async (c, next) => {
    const context = await value(options?.context, c)

    const { matched, response } = await handler.handle(c.req.raw, { ...options, context } as any)

    if (matched) {
      c.res = response
      return
    }

    await next()
  }
}
