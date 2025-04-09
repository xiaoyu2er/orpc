import type { StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import type { Context } from '../context'
import { fallbackContractConfig, ORPCError } from '@orpc/contract'

export interface GetMethodGuardPluginOptions {

  /**
   * The error thrown when the CSRF token is invalid.
   *
   * @default new ORPCError('METHOD_NOT_SUPPORTED')
   */
  error?: InstanceType<typeof ORPCError>
}

const GET_METHOD_GUARD_PLUGIN_IS_GET_METHOD_CONTEXT_SYMBOL = Symbol('GET_METHOD_GUARD_PLUGIN_IS_GET_METHOD_CONTEXT')

export class GetMethodGuardPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  private readonly error: Exclude<GetMethodGuardPluginOptions['error'], undefined>

  order = 7_000_000

  constructor(options: GetMethodGuardPluginOptions = {}) {
    this.error = options.error ?? new ORPCError('METHOD_NOT_SUPPORTED')
  }

  init(options: StandardHandlerOptions<T>): void {
    options.rootInterceptors ??= []
    options.clientInterceptors ??= []

    options.rootInterceptors.unshift((options) => {
      const isGetMethod = options.request.method === 'GET'

      return options.next({
        ...options,
        context: {
          ...options.context,
          [GET_METHOD_GUARD_PLUGIN_IS_GET_METHOD_CONTEXT_SYMBOL]: isGetMethod,
        },
      })
    })

    options.clientInterceptors.unshift((options) => {
      if (typeof options.context[GET_METHOD_GUARD_PLUGIN_IS_GET_METHOD_CONTEXT_SYMBOL] !== 'boolean') {
        throw new TypeError('[GetMethodGuardPlugin] GET method guard context has been corrupted or modified by another plugin or interceptor')
      }

      const procedureMethod = fallbackContractConfig('defaultMethod', options.procedure['~orpc'].route.method)

      if (options.context[GET_METHOD_GUARD_PLUGIN_IS_GET_METHOD_CONTEXT_SYMBOL] && procedureMethod !== 'GET') {
        throw this.error
      }

      return options.next()
    })
  }
}
