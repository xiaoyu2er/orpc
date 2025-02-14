import type { ClientContext, ClientOptions, HTTPMethod } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { ClientLink } from '../../types'
import type { EventSourceIteratorReconnectOptions } from '../standard'
import type { FetchWithContext } from './types'
import { ORPCError } from '@orpc/contract'
import { isAsyncIteratorObject, type StandardBody } from '@orpc/server-standard'
import { toFetchBody, toStandardBody } from '@orpc/server-standard-fetch'
import { RPCSerializer } from '@orpc/server/standard'
import { trim } from '@orpc/shared'
import { createReconnectableEventSourceIterator } from '../standard'

export class InvalidEventSourceRetryResponse extends Error {}

export interface RPCLinkOptions<TClientContext extends ClientContext> {
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
  method?(path: readonly string[], input: unknown, context: TClientContext): Promisable<HTTPMethod>

  /**
   * The method to use when the payload cannot safely pass to the server with method return from method function.
   * GET is not allowed, it's very dangerous.
   *
   * @default 'POST'
   */
  fallbackMethod?: Exclude<HTTPMethod, 'GET'>

  headers?(path: readonly string[], input: unknown, context: TClientContext): Promisable<HeadersInit>

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
  eventSourceRetryDelay?: (reconnectOptions: EventSourceIteratorReconnectOptions) => number

  /**
   * Function to determine if an error is retryable.
   *
   * @default () => true
   */
  eventSourceRetry?: (reconnectOptions: EventSourceIteratorReconnectOptions, path: readonly string[], input: unknown, context: TClientContext) => boolean
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

  constructor(options: RPCLinkOptions<TClientContext>) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.rpcSerializer = options.rpcSerializer ?? new RPCSerializer()
    this.maxUrlLength = options.maxUrlLength ?? 2083
    this.fallbackMethod = options.fallbackMethod ?? 'POST'
    this.url = options.url
    this.eventSourceMaxNumberOfRetries = options.eventSourceMaxNumberOfRetries ?? 5

    this.method = options.method ?? (() => this.fallbackMethod)
    this.headers = options.headers ?? (() => ({}))
    this.eventSourceRetry = options.eventSourceRetry ?? (() => true)

    this.eventSourceRetryDelay = options.eventSourceRetryDelay
      ?? (({ retryTimes, lastRetry }) => lastRetry ?? (1000 * 2 ** retryTimes))
  }

  async call(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<unknown> {
    const clientContext = this.getClientContext(options)
    const output = await this.performCall(path, input, options)

    if (!isAsyncIteratorObject(output)) {
      return output
    }

    return createReconnectableEventSourceIterator(output, async (reconnectOptions) => {
      if (reconnectOptions.retryTimes > this.eventSourceMaxNumberOfRetries) {
        return null
      }

      if (!this.eventSourceRetry(reconnectOptions, path, input, clientContext)) {
        return null
      }

      await new Promise(resolve => setTimeout(resolve, this.eventSourceRetryDelay(reconnectOptions)))

      const maybeIterator = await this.performCall(path, input, { ...options, lastEventId: reconnectOptions.lastEventId })

      if (!isAsyncIteratorObject(maybeIterator)) {
        throw new InvalidEventSourceRetryResponse('Invalid EventSource retry response')
      }

      return maybeIterator
    }, options.lastEventId)
  }

  private async performCall(
    path: readonly string[],
    input: unknown,
    options: ClientOptions<TClientContext>,
  ): Promise<unknown> {
    const clientContext = this.getClientContext(options)
    const encoded = await this.encodeRequest(path, input, clientContext)

    if (options.lastEventId !== undefined) {
      encoded.headers.set('last-event-id', options.lastEventId)
    }

    const fetchBody = toFetchBody(encoded.body, encoded.headers)

    const response = await this.fetch(encoded.url, {
      method: encoded.method,
      headers: encoded.headers,
      body: fetchBody,
      signal: options.signal,
    }, clientContext)

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
    clientContext: TClientContext,
  ): Promise<{ url: URL, method: HTTPMethod, headers: Headers, body: StandardBody }> {
    const expectedMethod = await this.method(path, input, clientContext)
    const headers = new Headers(await this.headers(path, input, clientContext))
    const url = new URL(`${trim(this.url, '/')}/${path.map(encodeURIComponent).join('/')}`)

    const serialized = this.rpcSerializer.serialize(input)

    if (
      expectedMethod === 'GET'
      && !(serialized instanceof FormData)
      && !isAsyncIteratorObject(serialized)
    ) {
      const getUrl = new URL(url)

      getUrl.searchParams.append('data', JSON.stringify(serialized))

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

  private getClientContext(options: ClientOptions<TClientContext>): TClientContext {
    return options.context ?? {} as TClientContext // options.context can be undefined when all field is optional
  }
}
