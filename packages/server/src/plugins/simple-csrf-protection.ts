import type { StandardHandlerInterceptorOptions, StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import type { Context } from '../context'
import { ORPCError } from '@orpc/client'
import { value, type Value } from '@orpc/shared'

export interface SimpleCsrfProtectionHandlerPluginOptions<T extends Context> {
  /**
   * The name of the header to check.
   *
   * @default 'x-csrf-token'
   */
  headerName?: Value<string, [options: StandardHandlerInterceptorOptions<T>]>

  /**
   * The value of the header to check.
   *
   * @default 'orpc'
   *
   */
  headerValue?: Value<string, [options: StandardHandlerInterceptorOptions<T>]>

  /**
   * The error thrown when the CSRF token is invalid.
   *
   * @default new ORPCError('CSRF_TOKEN_MISMATCH', {
   *   status: 403,
   *   message: 'Invalid CSRF token',
   * })
   */
  error?: InstanceType<typeof ORPCError>
}

const SIMPLE_CSRF_PROTECTION_CONTEXT_SYMBOL = Symbol('SIMPLE_CSRF_PROTECTION_CONTEXT')

export class SimpleCsrfProtectionHandlerPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  private readonly headerName: Exclude<SimpleCsrfProtectionHandlerPluginOptions<T>['headerName'], undefined>
  private readonly headerValue: Exclude<SimpleCsrfProtectionHandlerPluginOptions<T>['headerValue'], undefined>
  private readonly error: Exclude<SimpleCsrfProtectionHandlerPluginOptions<T>['error'], undefined>

  constructor(options: SimpleCsrfProtectionHandlerPluginOptions<T> = {}) {
    this.headerName = options.headerName ?? 'x-csrf-token'
    this.headerValue = options.headerValue ?? 'orpc'

    this.error = options.error ?? new ORPCError('CSRF_TOKEN_MISMATCH', {
      status: 403,
      message: 'Invalid CSRF token',
    })
  }

  order = 8_000_000

  init(options: StandardHandlerOptions<T>): void {
    options.rootInterceptors ??= []
    options.clientInterceptors ??= []

    options.rootInterceptors.unshift(async (options) => {
      const headerName = await value(this.headerName, options)
      const headerValue = await value(this.headerValue, options)

      return options.next({
        ...options,
        context: {
          ...options.context,
          [SIMPLE_CSRF_PROTECTION_CONTEXT_SYMBOL]: options.request.headers[headerName] === headerValue,
        },
      })
    })

    options.clientInterceptors.unshift((options) => {
      if (typeof options.context[SIMPLE_CSRF_PROTECTION_CONTEXT_SYMBOL] !== 'boolean') {
        throw new TypeError('[SimpleCsrfProtectionHandlerPlugin] Some plugin or interceptor is messing with the context')
      }

      if (!options.context[SIMPLE_CSRF_PROTECTION_CONTEXT_SYMBOL]) {
        throw this.error
      }

      return options.next()
    })
  }
}
