import type { MaybeOptionalOptions, Value } from '@orpc/shared'
import type { Context as HonoContext, MiddlewareHandler } from 'hono'
import type { Context } from '../../context'
import type { FetchHandler } from '../fetch'
import type { StandardHandleOptions } from '../standard'
import { resolveMaybeOptionalOptions, value } from '@orpc/shared'

export type CreateMiddlewareOptions<T extends Context> =
  & Omit<StandardHandleOptions<T>, 'context'>
  & (Record<never, never> extends T ? { context?: Value<T, [HonoContext]> } : { context: Value<T, [HonoContext]> })

export function createMiddleware<T extends Context>(
  handler: FetchHandler<T>,
  ...rest: MaybeOptionalOptions<CreateMiddlewareOptions<T>>
): MiddlewareHandler {
  const options = resolveMaybeOptionalOptions(rest)

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

    const context = await value(options.context ?? {} as T, c)

    const { matched, response } = await handler.handle(request, { ...options, context })

    if (matched) {
      return c.newResponse(response.body, response)
    }

    await next()
  }
}
