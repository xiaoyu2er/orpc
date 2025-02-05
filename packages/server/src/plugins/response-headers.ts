import type { StandardHandlerOptions } from '../adapters/standard'
import type { Context } from '../context'
import type { Plugin } from './base'

export interface ResponseHeadersPluginContext {
  resHeaders?: Headers
}

export class ResponseHeadersPlugin<TContext extends ResponseHeadersPluginContext & Context> implements Plugin<TContext> {
  init(options: StandardHandlerOptions<TContext>): void {
    options.interceptors ??= []

    options.interceptors.push(async (interceptorOptions) => {
      const headers = new Headers()

      interceptorOptions.context.resHeaders = headers

      const result = await interceptorOptions.next()

      if (!result.matched) {
        return result
      }

      const responseHeaders = result.response.headers

      for (const [key, value] of headers) {
        if (Array.isArray(responseHeaders[key])) {
          responseHeaders[key].push(value)
        }
        else if (responseHeaders[key] !== undefined) {
          responseHeaders[key] = [responseHeaders[key], value]
        }
        else {
          responseHeaders[key] = value
        }
      }

      return result
    })
  }
}
