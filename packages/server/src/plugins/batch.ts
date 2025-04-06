import type { StandardRequest } from '@orpc/standard-server'
import type { BatchResponseBodyItem } from '@orpc/standard-server/batch'
import type { StandardHandlerInterceptorOptions, StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import type { Context } from '../context'
import { ORPCError } from '@orpc/client'
import { parseBatchRequest, toBatchResponse } from '@orpc/standard-server/batch'

export interface BatchHandlerOptions<T extends Context> {
  /**
   */
  mapBatchItem?(request: StandardRequest, options: StandardHandlerInterceptorOptions<T>): StandardRequest
}

export class BatchHandlerPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  private readonly mapBatchItem: Exclude<BatchHandlerOptions<T>['mapBatchItem'], undefined>

  constructor(options: BatchHandlerOptions<T> = {}) {
    this.mapBatchItem = options.mapBatchItem ?? ((request, { request: batchRequest }) => ({
      ...request,
      headers: {
        ...batchRequest.headers,
        ...request.headers,
      },
    }))
  }

  init(options: StandardHandlerOptions<T>): void {
    options.rootInterceptors ??= []

    options.rootInterceptors.unshift(async (options) => {
      if (options.request.headers['x-orpc-batch'] !== '1') {
        return options.next()
      }

      let isParsing = false

      try {
        isParsing = true
        const parsed = parseBatchRequest({ ...options.request, body: await options.request.body() })
        isParsing = false

        const promises: (Promise<BatchResponseBodyItem> | undefined)[] = parsed
          .map(request => this.mapBatchItem(request, options))
          .map(
            (request, index) => options
              .next({ request: { ...request, body: () => Promise.resolve(request.body) }, context: options.context })
              .then(({ response, matched }) => {
                if (matched) {
                  return { ...response, index }
                }

                const error = new ORPCError('NOT_FOUND', {
                  message: 'No procedure matched',
                  status: 404,
                })

                return { index, status: error.status, headers: {}, body: error.toJSON() }
              })
              .catch((cause) => {
                const error = new ORPCError('INTERNAL_SERVER_ERROR', {
                  message: 'Internal server error',
                  status: 500,
                  cause,
                })

                return { index, status: error.status, headers: {}, body: error.toJSON() }
              }),
          )

        // wait until at least one request is resolved
        await Promise.race(promises)

        const response = toBatchResponse({
          status: 207,
          headers: {},
          body: (async function* () {
            while (true) {
              const handling = promises.filter(p => p !== undefined)

              if (handling.length === 0) {
                return
              }

              const result = await Promise.race(handling)
              yield result
              promises[result.index] = undefined
            }
          })(),
        })

        return {
          matched: true,
          response,
        }
      }
      catch (cause) {
        if (isParsing) {
          const error = new ORPCError('BAD_REQUEST', {
            message: 'Invalid batch request, this could be caused by a malformed request body or a missing header',
            cause,
          })

          return {
            matched: true,
            response: { status: error.status, headers: {}, body: error.toJSON() },
          }
        }

        throw cause
      }
    })
  }
}
