import type { Value } from '@orpc/shared'
import type { StandardBody, StandardServerEventSourceOptions } from '@orpc/standard-server'
import type { ClientContext, ClientLink, ClientOptionsOut } from '../../types'
import type { FetchWithContext } from './types'
import { isAsyncIteratorObject, stringifyJSON, trim, value } from '@orpc/shared'
import { toFetchBody, toStandardBody } from '@orpc/standard-server-fetch'
import { ORPCError } from '../../error'
import { createAutoRetryEventIterator, type EventIteratorReconnectOptions } from '../../event-iterator'
import { RPCSerializer } from '../../rpc'

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export class InvalidEventSourceRetryResponse extends Error { }

export interface RPCLinkOptions<TClientContext extends ClientContext> extends StandardServerEventSourceOptions {
  /**
   * Base url for all requests.
   */
  url: string

  /**
   * The maximum length of the URL.
   *
   * @default 2083
   */
  maxUrlLength?: number

  /**
   * The method used to make the request.
   *
   * @default 'POST'
   */
  method?: Value<HTTPMethod, [
    options: ClientOptionsOut<TClientContext>,
    path: readonly string[],
    input: unknown,
  ]>

  /**
   * The method to use when the payload cannot safely pass to the server with method return from method function.
   * GET is not allowed, it's very dangerous.
   *
   * @default 'POST'
   */
  fallbackMethod?: Exclude<HTTPMethod, 'GET'>

  /**
   * Inject headers to the request.
   */
  headers?: Value<[string, string][] | Record<string, string> | Headers, [
    options: ClientOptionsOut<TClientContext>,
    path: readonly string[],
    input: unknown,
  ]>

  /**
   * Custom fetch implementation.
   *
   * @default globalThis.fetch.bind(globalThis)
   */
  fetch?: FetchWithContext<TClientContext>

  rpcSerializer?: RPCSerializer

  /**
   * Maximum number of retry attempts for EventSource errors before throwing.
   *
   * @default 5
   */
  eventSourceMaxNumberOfRetries?: number

  /**
   * Delay (in ms) before retrying an EventSource call.
   *
   * @default ({retryTimes, lastRetry}) => lastRetry ?? (1000 * 2 ** retryTimes)
   */
  eventSourceRetryDelay?: Value<number, [
    reconnectOptions: EventIteratorReconnectOptions,
    options: ClientOptionsOut<TClientContext>,
    path: readonly string[],
    input: unknown,
  ]>

  /**
   * Function to determine if an error is retryable.
   *
   * @default true
   */
  eventSourceRetry?: Value<boolean, [
    reconnectOptions: EventIteratorReconnectOptions,
    options: ClientOptionsOut<TClientContext>,
    path: readonly string[],
    input: unknown,
  ]>
}

export class RPCLink<TClientContext extends ClientContext> implements ClientLink<TClientContext> {
  private readonly fetch: Exclude<RPCLinkOptions<TClientContext>['fetch'], undefined>
  private readonly rpcSerializer: Exclude<RPCLinkOptions<TClientContext>['rpcSerializer'], undefined>
  private readonly maxUrlLength: Exclude<RPCLinkOptions<TClientContext>['maxUrlLength'], undefined>
  private readonly fallbackMethod: Exclude<RPCLinkOptions<TClientContext>['fallbackMethod'], undefined>
  private readonly method: Exclude<RPCLinkOptions<TClientContext>['method'], undefined>
  private readonly headers: Exclude<RPCLinkOptions<TClientContext>['headers'], undefined>
  private readonly url: Exclude<RPCLinkOptions<TClientContext>['url'], undefined>
  private readonly eventSourceMaxNumberOfRetries: Exclude<RPCLinkOptions<TClientContext>['eventSourceMaxNumberOfRetries'], undefined>
  private readonly eventSourceRetryDelay: Exclude<RPCLinkOptions<TClientContext>['eventSourceRetryDelay'], undefined>
  private readonly eventSourceRetry: Exclude<RPCLinkOptions<TClientContext>['eventSourceRetry'], undefined>
  private readonly standardEventSourceOptions: StandardServerEventSourceOptions

  constructor(options: RPCLinkOptions<TClientContext>) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.rpcSerializer = options.rpcSerializer ?? new RPCSerializer()
    this.maxUrlLength = options.maxUrlLength ?? 2083
    this.fallbackMethod = options.fallbackMethod ?? 'POST'
    this.url = options.url
    this.eventSourceMaxNumberOfRetries = options.eventSourceMaxNumberOfRetries ?? 5

    this.method = options.method ?? this.fallbackMethod
    this.headers = options.headers ?? {}
    this.eventSourceRetry = options.eventSourceRetry ?? true

    this.eventSourceRetryDelay = options.eventSourceRetryDelay
      ?? (({ retryTimes, lastRetry }) => lastRetry ?? (1000 * 2 ** retryTimes))

    this.standardEventSourceOptions = options
  }

  async call(path: readonly string[], input: unknown, options: ClientOptionsOut<TClientContext>): Promise<unknown> {
    const output = await this.performCall(path, input, options)

    if (!isAsyncIteratorObject(output)) {
      return output
    }

    return createAutoRetryEventIterator(output, async (reconnectOptions) => {
      if (options.signal?.aborted || reconnectOptions.retryTimes > this.eventSourceMaxNumberOfRetries) {
        return null
      }

      if (!(await value(this.eventSourceRetry, reconnectOptions, options, path, input))) {
        return null
      }

      const delay = await value(this.eventSourceRetryDelay, reconnectOptions, options, path, input)

      await new Promise(resolve => setTimeout(resolve, delay))

      const updatedOptions = { ...options, lastEventId: reconnectOptions.lastEventId }
      const maybeIterator = await this.performCall(path, input, updatedOptions)

      if (!isAsyncIteratorObject(maybeIterator)) {
        throw new InvalidEventSourceRetryResponse('Invalid EventSource retry response')
      }

      return maybeIterator
    }, undefined)
  }

  private async performCall(
    path: readonly string[],
    input: unknown,
    options: ClientOptionsOut<TClientContext>,
  ): Promise<unknown> {
    const encoded = await this.encodeRequest(path, input, options)

    const fetchBody = toFetchBody(encoded.body, encoded.headers, this.standardEventSourceOptions)

    if (options.lastEventId !== undefined) {
      encoded.headers.set('last-event-id', options.lastEventId)
    }

    const response = await this.fetch(encoded.url, {
      method: encoded.method,
      headers: encoded.headers,
      body: fetchBody,
      signal: options.signal,
    }, options, path, input)

    const body = await toStandardBody(response)

    const deserialized = (() => {
      try {
        return this.rpcSerializer.deserialize(body as any)
      }
      catch (error) {
        if (response.ok) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: 'Invalid RPC response',
            cause: error,
          })
        }

        throw new ORPCError(response.status.toString(), {
          message: response.statusText,
        })
      }
    })()

    if (!response.ok) {
      if (ORPCError.isValidJSON(deserialized)) {
        throw ORPCError.fromJSON(deserialized)
      }

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Invalid RPC error response',
        cause: deserialized,
      })
    }

    return deserialized
  }

  private async encodeRequest(
    path: readonly string[],
    input: unknown,
    options: ClientOptionsOut<TClientContext>,
  ): Promise<{ url: URL, method: HTTPMethod, headers: Headers, body: StandardBody }> {
    const expectedMethod = await value(this.method, options, path, input)
    const headers = new Headers(await value(this.headers, options, path, input))
    const url = new URL(`${trim(this.url, '/')}/${path.map(encodeURIComponent).join('/')}`)

    const serialized = this.rpcSerializer.serialize(input)

    if (
      expectedMethod === 'GET'
      && !(serialized instanceof FormData)
      && !(serialized instanceof Blob)
      && !isAsyncIteratorObject(serialized)
    ) {
      const getUrl = new URL(url)

      getUrl.searchParams.append('data', stringifyJSON(serialized) ?? '')

      if (getUrl.toString().length <= this.maxUrlLength) {
        return {
          body: undefined,
          method: expectedMethod,
          headers,
          url: getUrl,
        }
      }
    }

    return {
      url,
      method: expectedMethod === 'GET' ? this.fallbackMethod : expectedMethod,
      headers,
      body: serialized as StandardBody,
    }
  }
}
