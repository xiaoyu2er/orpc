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
    const bodyProps = new Set(['arrayBuffer', 'blob', 'formData', 'json', 'text'] as const)
    type BodyProp = typeof bodyProps extends Set<infer T> ? T : never

    const request = c.req.method === 'GET' || c.req.method === 'HEAD'
      ? c.req.raw
      : new Proxy(c.req.raw, { // https://github.com/honojs/middleware/blob/main/packages/trpc-server/src/index.ts#L39
        get(target, prop) {
          if (bodyProps.has(prop as any)) {
            return () => c.req[prop as BodyProp]()
          }
          return Reflect.get(target, prop, target)
        },
      })

    const context = await value(options?.context ?? {}, c) as any

    const { matched, response } = await handler.handle(request, { ...options, context })

    if (matched) {
      return c.body(response.body, response)
    }

    await next()
  }
}
