import type { ErrorMap, HTTPPath, Meta, Schema } from '@orpc/contract'
import type { Interceptor } from '@orpc/shared'
import type { Context } from '../../context'
import type { Plugin } from '../../plugins'
import type { CreateProcedureClientOptions } from '../../procedure-client'
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

export type WellCreateProcedureClientOptions<TContext extends Context> =
  CreateProcedureClientOptions<TContext, Schema, Schema, unknown, ErrorMap, Meta, unknown> & {
    context: TContext
  }

export interface StandardHandlerOptions<TContext extends Context> {
  plugins?: Plugin<TContext>[]

  /**
   * Interceptors at the request level, helpful when you want catch errors
   */
  interceptors?: Interceptor<StandardHandlerInterceptorOptions<TContext>, StandardHandleResult, unknown>[]

  /**
   * Interceptors at the root level, helpful when you want override the response
   */
  interceptorsRoot?: Interceptor<StandardHandlerInterceptorOptions<TContext>, StandardHandleResult, unknown>[]
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

  handle(request: StandardRequest, ...[options]: StandardHandleRest<TContext>): Promise<StandardHandleResult> {
    return intercept(
      this.options.interceptorsRoot ?? [],
      {
        request,
        ...options,
        context: options?.context ?? {} as TContext, // context is optional only when all fields are optional so we can safely force it to have a context
      },
      async (interceptorOptions) => {
        try {
          return await intercept(
            this.options.interceptors ?? [],
            interceptorOptions,
            async (interceptorOptions) => {
              const method = interceptorOptions.request.method
              const url = interceptorOptions.request.url
              const pathname = `/${trim(url.pathname.replace(interceptorOptions.prefix ?? '', ''), '/')}` as const

              const match = await this.matcher.match(method, pathname)

              if (!match) {
                return { matched: false, response: undefined }
              }

              const clientOptions: WellCreateProcedureClientOptions<TContext> = {
                context: interceptorOptions.context,
                path: match.path,
              }

              this.plugin.beforeCreateProcedureClient(clientOptions, interceptorOptions)

              const client = createProcedureClient(match.procedure, clientOptions)

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
      },
    )
  }
}
