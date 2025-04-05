import type { Value } from '@orpc/shared'
import type { StandardHeaders, StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { StandardLinkOptions, StandardLinkPlugin } from '../adapters/standard'
import type { ClientContext, ClientOptions } from '../types'
import { isAsyncIteratorObject, value } from '@orpc/shared'
import { parseBatchResponse, toBatchRequest } from '@orpc/standard-server/batch'

export interface BatchLinkPluginGroup<T extends ClientContext> {
  condition(options: ClientOptions<T>, path: readonly string[], input: unknown): boolean
  context: T
  path?: readonly string[]
  input?: unknown
}

export interface BatchLinkPluginOptions<T extends ClientContext> {
  groups: readonly [BatchLinkPluginGroup<T>, ...BatchLinkPluginGroup<T>[]]

  /**
   * Defines the URL to use for the batch request.
   *
   * @default the URL of the first request in the batch
   */
  url?: Value<string | URL, [
    batchItems: readonly [options: ClientOptions<T>, path: readonly string[], input: unknown, request: StandardRequest][],
  ]>

  /**
   * Defines the HTTP headers to use for the batch request.
   *
   * @default The same headers of all requests in the batch
   */
  headers?: Value<StandardHeaders, [
    batchItems: readonly [options: ClientOptions<T>, path: readonly string[], input: unknown, request: StandardRequest, batchUrl: URL][],
  ]>

  /**
   * Map the batch request items before sending them.
   *
   * @default Removes headers that are duplicated in the batch headers.
   */
  mapBatchItem?: (
    options: ClientOptions<T>,
    path: readonly string[],
    input: unknown,
    request: StandardRequest,
    batchUrl: URL,
    batchHeaders: StandardHeaders,
  ) => StandardRequest
}

export class BatchLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  private readonly groups: Exclude<BatchLinkPluginOptions<T>['groups'], undefined>
  private readonly batchUrl: Exclude<BatchLinkPluginOptions<T>['url'], undefined>
  private readonly batchHeaders: Exclude<BatchLinkPluginOptions<T>['headers'], undefined>
  private readonly mapBatchItem: Exclude<BatchLinkPluginOptions<T>['mapBatchItem'], undefined>

  private pending: Map<
    BatchLinkPluginGroup<T>,
    [
      options: ClientOptions<T>,
      path: readonly string[],
      input: unknown,
      request: StandardRequest,
      resolve: (response: StandardLazyResponse) => void,
      reject: (e: unknown) => void,
    ][]
  >

  constructor(options: BatchLinkPluginOptions<T>) {
    this.groups = options.groups
    this.pending = new Map()
  }

  init(options: StandardLinkOptions<T>): void {
    options.clientInterceptors ??= []

    options.clientInterceptors.push((options) => {
      if (
        options.request.body instanceof Blob
        || options.request.body instanceof FormData
        || isAsyncIteratorObject(options.request.body)
      ) {
        return options.next()
      }

      const group = this.groups.find(group => group.condition(options.options, options.path, options.input))

      if (!group) {
        return options.next()
      }

      const handleBatch = async () => {
        const pending = this.pending
        this.pending = new Map()

        for (const [group, batchItems] of pending) {
          for (const method of ['GET', 'POST'] as const) {
            const methodItems = batchItems.filter(
              item => method === 'GET' ? item[3].method === 'GET' : item[3].method !== 'GET',
            )

            if (methodItems.length === 0) {
              continue
            }

            if (methodItems.length === 1) {
              const [clientOptions, path, input, request, resolve, reject] = methodItems[0]!
              options.next({ options: clientOptions, path, input, request })
                .then(resolve)
                .catch(reject)

              continue
            }

            const batchUrl = new URL(await value(this.batchUrl, methodItems.map(([options, path, input, request]) => [options, path, input, request] satisfies [any, any, any, any])))
            const batchHeaders = await value(this.batchHeaders, methodItems.map(([options, path, input, request]) => [options, path, input, request, batchUrl] satisfies [any, any, any, any, any]))
            const mappedItems = methodItems.map(([options, path, input, request]) => this.mapBatchItem(options, path, input, request, batchUrl, batchHeaders))
            const reItems: ({ resolve: any, reject: any } | undefined)[] = methodItems.map(([,,,,resolve, reject]) => ({ resolve, reject }))

            const batchRequest = toBatchRequest({
              method,
              url: batchUrl,
              headers: batchHeaders,
              requests: mappedItems,
            })

            try {
              const response = await options.next({
                options: { context: group.context, signal: batchRequest.signal },
                input: group.input,
                path: group.path ?? [],
                request: batchRequest,
              })

              const parsed = parseBatchResponse({ ...response, body: await response.body() })

              for await (const item of parsed) {
                reItems[item.index]?.resolve?.(item)
                reItems[item.index] = undefined
              }
            }
            catch (error) {
              for (const value of reItems) {
                value?.reject?.(error)
              }
            }
          }
        }
      }

      return new Promise((resolve, reject) => {
        const batchItems = this.pending.get(group)

        if (batchItems) {
          batchItems.push([options.options, options.path, options.input, options.request, resolve, reject])
        }
        else {
          this.pending.set(group, [[options.options, options.path, options.input, options.request, resolve, reject]])
        }

        setTimeout(handleBatch)
      })
    })
  }
}
