import type { Context } from '../../context'
import type { HandlerPlugin } from '../../plugins'
import type { StandardHandlerOptions } from '../standard'
import { ORPCError } from '@orpc/client'
import { once } from '@orpc/shared'

export interface BodySizeLimitPluginOptions {
  /**
   * The maximum size of the body in bytes.
   */
  maxBodySize: number
}

export class BodySizeLimitPlugin<T extends Context> implements HandlerPlugin<T> {
  private readonly maxBodySize: number

  constructor(options: BodySizeLimitPluginOptions) {
    this.maxBodySize = options.maxBodySize
  }

  init(options: StandardHandlerOptions<T>): void {
    options.interceptors ??= []

    options.interceptors.unshift((interceptorOptions) => {
      if (interceptorOptions.request.headers['content-length']) {
        const contentLength = Number(interceptorOptions.request.headers['content-length'])

        if (contentLength > this.maxBodySize) {
          throw new ORPCError('PAYLOAD_TOO_LARGE')
        }
      }

      return interceptorOptions.next({
        ...interceptorOptions,
        request: {
          ...interceptorOptions.request,
          body: once(() => {
            if (interceptorOptions.request.raw.adapter !== 'fetch') {
              throw new ORPCError('INTERNAL_SERVER_ERROR', {
                cause: new Error(`BodySizeLimitPlugin error: expected adapter 'fetch' but received '${interceptorOptions.request.raw.adapter}'.`),
              })
            }

            const rawRequest = interceptorOptions.request.raw.request as Request

            if (rawRequest.body) {
              let currentBodySize = 0

              const rawReader = rawRequest.body.getReader()

              const reader = new ReadableStream({
                start: async (controller) => {
                  try {
                    while (true) {
                      const { done, value } = await rawReader.read()
                      if (done) {
                        break
                      }

                      currentBodySize += value.length

                      if (currentBodySize > this.maxBodySize) {
                        controller.error(new ORPCError('PAYLOAD_TOO_LARGE'))
                        break
                      }

                      controller.enqueue(value)
                    }
                  }
                  finally {
                    controller.close()
                  }
                },
              })

              const requestInit: RequestInit & { duplex: 'half' } = { body: reader, duplex: 'half' }
              interceptorOptions.request.raw.request = new Request(rawRequest, requestInit as RequestInit)
            }

            return interceptorOptions.request.body()
          }),
        },
      })
    })
  }
}
