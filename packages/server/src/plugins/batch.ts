import type { Value } from '@orpc/shared'
import type { StandardHeaders, StandardRequest } from '@orpc/standard-server'
import type { BatchResponseBodyItem } from '@orpc/standard-server/batch'
import type { StandardHandlerInterceptorOptions, StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import type { Context } from '../context'
import { ORPCError } from '@orpc/client'
import { value } from '@orpc/shared'
import { parseBatchRequest, toBatchResponse } from '@orpc/standard-server/batch'

export interface BatchHandlerOptions<T extends Context> {
  /**
   * Map the request before processing it.
   *
   * @default merged back batch request headers into the request
   */
  mapRequest?(request: StandardRequest, batchOptions: StandardHandlerInterceptorOptions<T>): StandardRequest

  /**
   * Success batch response status code.
   *
   * @default 207
   */
  successStatus?: Value<number, [responses: Promise<BatchResponseBodyItem>[], batchOptions: StandardHandlerInterceptorOptions<T>]>

  /**
   * success batch response headers.
   *
   * @default {}
   */
  headers?: Value<StandardHeaders, [responses: Promise<BatchResponseBodyItem>[], batchOptions: StandardHandlerInterceptorOptions<T>]>
}

export class BatchHandlerPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  private readonly mapRequest: Exclude<BatchHandlerOptions<T>['mapRequest'], undefined>
  private readonly successStatus: Exclude<BatchHandlerOptions<T>['successStatus'], undefined>
  private readonly headers: Exclude<BatchHandlerOptions<T>['headers'], undefined>

  constructor(options: BatchHandlerOptions<T> = {}) {
    this.mapRequest = options.mapRequest ?? ((request, { request: batchRequest }) => ({
      ...request,
      headers: {
        ...batchRequest.headers,
        ...request.headers,
      },
    }))

    this.successStatus = options.successStatus ?? 207
    this.headers = options.headers ?? {}
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

        const responses: Promise<BatchResponseBodyItem>[] = parsed
          .map((request, index) => {
            const mapped = this.mapRequest(request, options)

            return options
              .next({ ...options, request: { ...mapped, body: () => Promise.resolve(mapped.body) } })
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
              })
          },
          )

        // wait until at least one request is resolved
        await Promise.race(responses)

        const status = await value(this.successStatus, responses, options)
        const headers = await value(this.headers, responses, options)

        const response = toBatchResponse({
          status,
          headers,
          body: (async function* () {
            const promises: (Promise<BatchResponseBodyItem> | undefined)[] = [...responses]

            while (true) {
              const handling = promises.filter(p => p !== undefined)

              if (handling.length === 0) {
                return
              }

              const result = await Promise.race(handling)
              promises[result.index] = undefined
              yield result
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
