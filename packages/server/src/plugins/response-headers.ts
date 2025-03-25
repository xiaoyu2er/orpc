import type { StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'

export interface ResponseHeadersPluginContext {
  resHeaders?: Headers
}

export class ResponseHeadersPlugin<T extends ResponseHeadersPluginContext> implements StandardHandlerPlugin<T> {
  init(options: StandardHandlerOptions<T>): void {
    options.rootInterceptors ??= []

    options.rootInterceptors.push(async (interceptorOptions) => {
      const resHeaders = interceptorOptions.context.resHeaders ?? new Headers()

      const result = await interceptorOptions.next({
        ...interceptorOptions,
        context: {
          ...interceptorOptions.context,
          resHeaders,
        },
      })

      if (!result.matched) {
        return result
      }

      const responseHeaders = result.response.headers

      for (const [key, value] of resHeaders) {
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
