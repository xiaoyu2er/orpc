import type { ErrorFromErrorMap, HTTPPath, Meta, Schema, SchemaOutput } from '@orpc/contract'
import type { StandardRequest, StandardResponse } from '@orpc/server-standard'
import type { Interceptor, MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { Plugin } from '../../plugins'
import type { ProcedureClientInterceptorOptions } from '../../procedure-client'
import type { Router } from '../../router'
import type { StandardCodec, StandardMatcher } from './types'
import { ORPCError, toORPCError } from '@orpc/client'
import { intercept, trim } from '@orpc/shared'
import { CompositePlugin } from '../../plugins'
import { createProcedureClient } from '../../procedure-client'

export type StandardHandleOptions<T extends Context> =
  & { prefix?: HTTPPath }
  & (Record<never, never> extends T ? { context?: T } : { context: T })

export type WellStandardHandleOptions<T extends Context> = StandardHandleOptions<T> & { context: T }

export type StandardHandleResult = { matched: true, response: StandardResponse } | { matched: false, response: undefined }

export type StandardHandlerInterceptorOptions<TContext extends Context> = WellStandardHandleOptions<TContext> & { request: StandardRequest }

export interface StandardHandlerOptions<TContext extends Context> {
  plugins?: Plugin<TContext>[]

  /**
   * Interceptors at the request level, helpful when you want catch errors
   */
  interceptors?: Interceptor<StandardHandlerInterceptorOptions<TContext>, StandardHandleResult, unknown>[]

  /**
   * Interceptors at the root level, helpful when you want override the request/response
   */
  rootInterceptors?: Interceptor<StandardHandlerInterceptorOptions<TContext>, StandardHandleResult, unknown>[]

  /**
   *
   * Interceptors for procedure client.
   */
  clientInterceptors?: Interceptor<
    ProcedureClientInterceptorOptions<TContext, Schema, Record<never, never>, Meta>,
    SchemaOutput<Schema, unknown>,
    ErrorFromErrorMap<Record<never, never>>
  >[]
}

export class StandardHandler<T extends Context> {
  private readonly plugin: CompositePlugin<T>

  constructor(
    router: Router<T, any>,
    private readonly matcher: StandardMatcher,
    private readonly codec: StandardCodec,
    private readonly options: NoInfer<StandardHandlerOptions<T>> = {},
  ) {
    this.plugin = new CompositePlugin(options.plugins)

    this.plugin.init(this.options)
    this.matcher.init(router)
  }

  handle(request: StandardRequest, ...[options]: MaybeOptionalOptions<StandardHandleOptions<T>>): Promise<StandardHandleResult> {
    return intercept(
      this.options.rootInterceptors ?? [],
      {
        request,
        ...options,
        context: options?.context ?? {} as T, // context is optional only when all fields are optional so we can safely force it to have a context
      },
      async (interceptorOptions) => {
        let isDecoding = false

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

              const client = createProcedureClient(match.procedure, {
                context: interceptorOptions.context,
                path: match.path,
                interceptors: this.options.clientInterceptors,
              })

              isDecoding = true
              const input = await this.codec.decode(request, match.params, match.procedure)
              isDecoding = false

              const lastEventId = Array.isArray(request.headers['last-event-id'])
                ? request.headers['last-event-id'].at(-1)
                : request.headers['last-event-id']

              const output = await client(input, { signal: request.signal, lastEventId })

              const response = this.codec.encode(output, match.procedure)

              return {
                matched: true,
                response,
              }
            },
          )
        }
        catch (e) {
          const error = isDecoding
            ? new ORPCError('BAD_REQUEST', {
              message: `Malformed request. Ensure the request body is properly formatted and the 'Content-Type' header is set correctly.`,
              cause: e,
            })
            : toORPCError(e)

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
