import type { InterceptorOptions, ThrowableError, Value } from '@orpc/shared'
import type { StandardHeaders, StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { StandardLinkClientInterceptorOptions, StandardLinkOptions, StandardLinkPlugin } from '../adapters/standard'
import type { ClientContext } from '../types'
import { isAsyncIteratorObject, splitInHalf, value } from '@orpc/shared'
import { parseBatchResponse, toBatchRequest } from '@orpc/standard-server/batch'

export interface BatchLinkPluginGroup<T extends ClientContext> {
  condition(options: StandardLinkClientInterceptorOptions<T>): boolean
  context: T
  path?: readonly string[]
  input?: unknown
}

export interface BatchLinkPluginOptions<T extends ClientContext> {
  groups: readonly [BatchLinkPluginGroup<T>, ...BatchLinkPluginGroup<T>[]]

  /**
   * The maximum number of requests in the batch.
   *
   * @default 10
   */
  maxBatchSize?: Value<number, [readonly [StandardLinkClientInterceptorOptions<T>, ...StandardLinkClientInterceptorOptions<T>[]]]>

  /**
   * Defines the URL to use for the batch request.
   *
   * @default the URL of the first request in the batch + '/__batch__'
   */
  url?: Value<string | URL, [readonly [StandardLinkClientInterceptorOptions<T>, ...StandardLinkClientInterceptorOptions<T>[]]]>

  /**
   * The maximum length of the URL.
   *
   * @default 2083
   */
  maxUrlLength?: Value<number, [readonly [StandardLinkClientInterceptorOptions<T>, ...StandardLinkClientInterceptorOptions<T>[]]]>

  /**
   * Defines the HTTP headers to use for the batch request.
   *
   * @default The same headers of all requests in the batch
   */
  headers?: Value<StandardHeaders, [readonly [StandardLinkClientInterceptorOptions<T>, ...StandardLinkClientInterceptorOptions<T>[]]]>

  /**
   * Map the batch request items before sending them.
   *
   * @default Removes headers that are duplicated in the batch headers.
   */
  mapBatchItem?: (options: StandardLinkClientInterceptorOptions<T> & { batchUrl: URL, batchHeaders: StandardHeaders }) => StandardRequest
}

export class BatchLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  private readonly groups: Exclude<BatchLinkPluginOptions<T>['groups'], undefined>
  private readonly maxBatchSize: Exclude<BatchLinkPluginOptions<T>['maxBatchSize'], undefined>
  private readonly batchUrl: Exclude<BatchLinkPluginOptions<T>['url'], undefined>
  private readonly maxUrlLength: Exclude<BatchLinkPluginOptions<T>['maxUrlLength'], undefined>
  private readonly batchHeaders: Exclude<BatchLinkPluginOptions<T>['headers'], undefined>
  private readonly mapBatchItem: Exclude<BatchLinkPluginOptions<T>['mapBatchItem'], undefined>

  private pending: Map<
    BatchLinkPluginGroup<T>,
    [
      options: InterceptorOptions<StandardLinkClientInterceptorOptions<T>, StandardLazyResponse, ThrowableError>,
      resolve: (response: StandardLazyResponse) => void,
      reject: (e: unknown) => void,
    ][]
  >

  constructor(options: BatchLinkPluginOptions<T>) {
    this.groups = options.groups
    this.pending = new Map()

    this.maxBatchSize = options.maxBatchSize ?? 10
    this.maxUrlLength = options.maxUrlLength ?? 2083

    this.batchUrl = options.url ?? (([options]) => `${options.request.url.origin}${options.request.url.pathname}/__batch__`)

    this.batchHeaders = options.headers ?? (([options, ...rest]) => {
      const headers: StandardHeaders = {}

      for (const [key, value] of Object.entries(options.request.headers)) {
        if (rest.every(item => item.request.headers[key] === value)) {
          headers[key] = value
        }
      }

      return headers
    })

    this.mapBatchItem = options.mapBatchItem ?? (({ request, batchUrl, batchHeaders }) => {
      const headers: StandardHeaders = {}

      for (const [key, value] of Object.entries(request.headers)) {
        if (batchHeaders[key] !== value) {
          headers[key] = value
        }
      }

      return {
        method: request.method,
        url: batchUrl,
        headers,
        body: request.body,
        signal: request.signal,
      }
    })
  }

  init(options: StandardLinkOptions<T>): void {
    options.clientInterceptors ??= []

    options.clientInterceptors.push((options) => {
      if (options.request.headers['x-orpc-batch'] !== '1') {
        return options.next()
      }

      return options.next({
        ...options,
        request: {
          ...options.request,
          headers: {
            ...options.request.headers,
            'x-orpc-batch': undefined,
          },
        },
      })
    })

    options.clientInterceptors.push((options) => {
      if (
        options.request.body instanceof Blob
        || options.request.body instanceof FormData
        || isAsyncIteratorObject(options.request.body)
      ) {
        return options.next()
      }

      const group = this.groups.find(group => group.condition(options))

      if (!group) {
        return options.next()
      }

      return new Promise((resolve, reject) => {
        this.#push(group, options, resolve, reject)
        setTimeout(() => this.#resolvePending())
      })
    })
  }

  #push(
    group: BatchLinkPluginGroup<T>,
    options: InterceptorOptions<StandardLinkClientInterceptorOptions<T>, StandardLazyResponse, ThrowableError>,
    resolve: (response: StandardLazyResponse) => void,
    reject: (e: unknown) => void,
  ): void {
    const items = this.pending.get(group)

    if (items) {
      items.push([options, resolve, reject])
    }
    else {
      this.pending.set(group, [[options, resolve, reject]])
    }
  }

  async #resolvePending(): Promise<void> {
    const pending = this.pending
    this.pending = new Map()

    for (const [group, items] of pending) {
      const getItems = items.filter(([options]) => options.request.method === 'GET')
      const restItems = items.filter(([options]) => options.request.method !== 'GET')

      this.#handleBatch('GET', group, getItems)
      this.#handleBatch('POST', group, restItems)
    }
  }

  async #handleBatch(
    method: 'GET' | 'POST',
    group: BatchLinkPluginGroup<T>,
    _items: typeof this.pending extends Map<any, infer U> ? U : never,
  ): Promise<void> {
    if (!_items.length) {
      return
    }

    const items = _items as [typeof _items[number], ...typeof _items[number][]]
    if (items.length === 1) {
      items[0][0].next().then(items[0][1]).catch(items[0][2])
      return
    }

    try {
      const options = items.map(([options]) => options) as [InterceptorOptions<StandardLinkClientInterceptorOptions<T>, StandardLazyResponse, ThrowableError>, ...InterceptorOptions<StandardLinkClientInterceptorOptions<T>, StandardLazyResponse, ThrowableError>[]]

      const maxBatchSize = await value(this.maxBatchSize, options)

      if (items.length > maxBatchSize) {
        const [first, second] = splitInHalf(items)
        this.#handleBatch(method, group, first)
        this.#handleBatch(method, group, second)
        return
      }

      const batchUrl = new URL(await value(this.batchUrl, options))
      const batchHeaders = await value(this.batchHeaders, options)
      const mappedItems = items.map(([options]) => this.mapBatchItem({ ...options, batchUrl, batchHeaders }))

      const batchRequest = toBatchRequest({
        method,
        url: batchUrl,
        headers: batchHeaders,
        requests: mappedItems,
      })

      const maxUrlLength = await value(this.maxUrlLength, options)

      if (batchRequest.url.toString().length > maxUrlLength) {
        const [first, second] = splitInHalf(items)
        this.#handleBatch(method, group, first)
        this.#handleBatch(method, group, second)
        return
      }

      const response = await options[0].next({
        request: { ...batchRequest, headers: { ...batchRequest.headers, 'x-orpc-batch': '1' } },
        signal: batchRequest.signal,
        context: group.context,
        input: group.input,
        path: group.path ?? [],
      })

      const parsed = parseBatchResponse({ ...response, body: await response.body() })

      for await (const item of parsed) {
        items[item.index]?.[1]({ ...item, body: () => Promise.resolve(item.body) })
      }
    }
    catch (error) {
      for (const value of items) {
        value[2](error)
      }
    }
    finally {
      for (const value of items) {
        value[2](
          new Error('Something went wrong make batch response not contains this response. This is a bug please report it.'),
        )
      }
    }
  }
}
