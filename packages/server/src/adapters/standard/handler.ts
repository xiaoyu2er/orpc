import type { HTTPPath } from '@orpc/contract'
import type { Interceptable } from '@orpc/shared'
import type { Context } from '../../context'
import type { Plugin } from '../../plugins'
import type { Router } from '../../router'
import type { StandardCodec, StandardMatcher, StandardRequest, StandardResponse } from './types'
import { toORPCError } from '@orpc/contract'
import { intercept, trim } from '@orpc/shared'
import { CompositePlugin } from '../../plugins'
import { createProcedureClient } from '../../procedure-client'

export type StandardHandleOptions<T extends Context> =
  & { prefix?: HTTPPath }
  & (Record<never, never> extends T ? { context?: T } : { context: T })

export type WellStandardHandleOptions<T extends Context> = StandardHandleOptions<T> & { context: T }

export type StandardHandleRest<T extends Context> =
  | [options: StandardHandleOptions<T>]
  | (Record<never, never> extends T ? [] : never)

export type StandardHandleResult = { matched: true, response: StandardResponse } | { matched: false, response: undefined }

export type StandardHandlerInterceptorOptions<TContext extends Context> = WellStandardHandleOptions<TContext> & { request: StandardRequest }

export interface StandardHandlerOptions<TContext extends Context> extends Interceptable<
  StandardHandlerInterceptorOptions<TContext>,
  StandardHandleResult,
  unknown
> {
  plugins?: Plugin<TContext>[]
}

export class StandardHandler<TContext extends Context> {
  private readonly plugin: CompositePlugin<TContext>

  constructor(
    router: Router<TContext, any>,
    private readonly matcher: StandardMatcher,
    private readonly codec: StandardCodec,
    private readonly options: NoInfer<StandardHandlerOptions<TContext>> = {},
  ) {
    this.plugin = new CompositePlugin(options?.plugins)
    this.plugin.init(this.options)

    this.matcher.init(router)
  }

  async handle(request: StandardRequest, ...[options]: StandardHandleRest<TContext>): Promise<StandardHandleResult> {
    try {
      const handleOptions = (options ?? {}) as WellStandardHandleOptions<TContext> // options only undefined when all fields are optional so we can safely force it

      return await intercept(
        this.options,
        { request, ...handleOptions },
        async ({ request, context }) => {
          const method = request.method
          const url = request.url
          const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}` as const

          const match = await this.matcher.match(method, pathname)

          if (!match) {
            return { matched: false, response: undefined }
          }

          const client = createProcedureClient(match.procedure, {
            context,
            path: match.path,
          })

          const input = await this.codec.decode(request, match.params, match.procedure)

          const output = await client(input, { signal: request.signal })

          const response = this.codec.encode(output, match.procedure)

          return {
            matched: true,
            response,
          }
        },
      )
    }
    catch (e) {
      const error = toORPCError(e)

      const response = this.codec.encodeError(error)

      return {
        matched: true,
        response,
      }
    }
  }
}
