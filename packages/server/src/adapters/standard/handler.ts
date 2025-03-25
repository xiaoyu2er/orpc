import type { AnySchema, ErrorFromErrorMap, HTTPPath, InferSchemaOutput, Meta } from '@orpc/contract'
import type { Interceptor, MaybeOptionalOptions } from '@orpc/shared'
import type { StandardLazyRequest, StandardResponse } from '@orpc/standard-server'
import type { Context } from '../../context'
import type { HandlerPlugin } from '../../plugins'
import type { ProcedureClientInterceptorOptions } from '../../procedure-client'
import type { Router } from '../../router'
import type { StandardCodec, StandardMatcher } from './types'
import { ORPCError, toORPCError } from '@orpc/client'
import { intercept, trim } from '@orpc/shared'
import { CompositeHandlerPlugin } from '../../plugins'
import { createProcedureClient } from '../../procedure-client'

export type StandardHandleOptions<T extends Context> =
  & { prefix?: HTTPPath }
  & (Record<never, never> extends T ? { context?: T } : { context: T })

export type StandardHandleResult = { matched: true, response: StandardResponse } | { matched: false, response: undefined }

export type StandardHandlerInterceptorOptions<T extends Context> =
  & StandardHandleOptions<T>
  & { context: T, request: StandardLazyRequest }

export interface StandardHandlerOptions<TContext extends Context> {
  plugins?: HandlerPlugin<TContext>[]

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
    ProcedureClientInterceptorOptions<TContext, AnySchema, Record<never, never>, Meta>,
    InferSchemaOutput<AnySchema>,
    ErrorFromErrorMap<Record<never, never>>
  >[]
}

export class StandardHandler<T extends Context> {
  private readonly plugin: CompositeHandlerPlugin<T>

  constructor(
    router: Router<any, T>,
    private readonly matcher: StandardMatcher,
    private readonly codec: StandardCodec,
    private readonly options: NoInfer<StandardHandlerOptions<T>>,
  ) {
    this.plugin = new CompositeHandlerPlugin(options.plugins)

    this.plugin.init(this.options)
    this.matcher.init(router)
  }

  handle(request: StandardLazyRequest, ...[options]: MaybeOptionalOptions<StandardHandleOptions<T>>): Promise<StandardHandleResult> {
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
            async ({ request, context, prefix }) => {
              const method = request.method
              const url = request.url
              const pathname = `/${trim(url.pathname.replace(prefix ?? '', ''), '/')}` as const

              const match = await this.matcher.match(method, pathname)

              if (!match) {
                return { matched: false, response: undefined }
              }

              const client = createProcedureClient(match.procedure, {
                context,
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
          const error = isDecoding && !(e instanceof ORPCError)
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
