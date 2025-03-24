import type { NodeHttpRequest } from '@orpc/standard-server-node'
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
            if (interceptorOptions.request.raw.adapter !== 'node') {
              throw new ORPCError('INTERNAL_SERVER_ERROR', {
                cause: new Error(`BodySizeLimitPlugin error: expected adapter 'node' but received '${interceptorOptions.request.raw.adapter}'.`),
              })
            }

            const req = interceptorOptions.request.raw.request as NodeHttpRequest

            let currentBodySize = 0

            req.on('data', (chunk) => {
              currentBodySize += chunk.length

              if (currentBodySize > this.maxBodySize) {
                throw new ORPCError('PAYLOAD_TOO_LARGE')
              }
            })

            return interceptorOptions.request.body()
          }),
        },
      })
    })
  }
}
