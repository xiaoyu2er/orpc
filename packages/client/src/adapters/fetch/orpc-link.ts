import type { ClientContext, ClientOptions, HTTPMethod } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { ClientLink } from '../../types'
import type { FetchWithContext } from './types'
import { ORPCError } from '@orpc/contract'
import { getEventSourceRetry, getTrackId, isAsyncIteratorObject, type StandardBody } from '@orpc/server-standard'
import { toFetchBody, toStandardBody } from '@orpc/server-standard-fetch'
import { RPCSerializer } from '@orpc/server/standard'
import { isObject, trim } from '@orpc/shared'

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
  maxURLLength?: number

  /**
   * The method used to make the request.
   *
   * @default 'POST'
   */
  method?(path: readonly string[], input: unknown, context: TClientContext): Promisable<HTTPMethod | undefined>

  /**
   * The method to use when the payload cannot safely pass to the server with method return from method function.
   * GET is not allowed, it's very dangerous.
   *
   * @default 'POST'
   */
  fallbackMethod?: Exclude<HTTPMethod, 'GET'>

  headers?(path: readonly string[], input: unknown, context: TClientContext): Promisable<Headers | Record<string, string>>

  fetch?: FetchWithContext<TClientContext>

  rpcSerializer?: RPCSerializer

  /**
   * The maximum retry time for EventSource.
   *
   * @default 3
   */
  maxEventSourceRetryTimes?: number
}

export class RPCLink<TClientContext extends ClientContext> implements ClientLink<TClientContext> {
  private readonly fetch: FetchWithContext<TClientContext>
  private readonly rpcSerializer: RPCSerializer
  private readonly maxURLLength: number
  private readonly fallbackMethod: Exclude<HTTPMethod, 'GET'>
  private readonly getMethod: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<HTTPMethod>
  private readonly getHeaders: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<Headers>
  private readonly url: string
  private readonly maxEventSourceRetryTimes: number

  constructor(options: RPCLinkOptions<TClientContext>) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.rpcSerializer = options.rpcSerializer ?? new RPCSerializer()
    this.maxURLLength = options.maxURLLength ?? 2083
    this.fallbackMethod = options.fallbackMethod ?? 'POST'
    this.url = options.url
    this.maxEventSourceRetryTimes = options.maxEventSourceRetryTimes ?? 3

    this.getMethod = async (path, input, context) => {
      return await options.method?.(path, input, context) ?? this.fallbackMethod
    }

    this.getHeaders = async (path, input, context) => {
      return new Headers(await options.headers?.(path, input, context))
    }
  }

  async call(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<unknown> {
    let output = await this._call(path, input, options)

    if (!isAsyncIteratorObject(output)) {
      return output
    }

    let lastRetry = 1000
    let retryTimes = 0
    let lastEventId: string | undefined = options.lastEventId

    const iterator: AsyncIteratorObject<unknown, unknown, undefined> = {
      next: async () => {
        if (!isAsyncIteratorObject(output)) {
          throw new Error('Invalid response')
        }

        try {
          const result = await output.next()

          retryTimes = 0

          lastRetry = getEventSourceRetry(result.value) ?? lastRetry
          lastEventId = getTrackId(result.value)

          return result
        }
        catch (error) {
          if (retryTimes >= this.maxEventSourceRetryTimes) {
            throw error
          }

          await new Promise(resolve => setTimeout(resolve, lastRetry))
          retryTimes += 1
          lastRetry *= 2
          output = await this._call(path, input, { ...options, lastEventId })

          return iterator.next()
        }
      },
      return: async (value) => {
        if (!isAsyncIteratorObject(output)) {
          throw new Error('Invalid response')
        }

        await output.return?.()

        return { done: true, value }
      },
      throw: async (e) => {
        if (!isAsyncIteratorObject(output)) {
          throw new Error('Invalid response')
        }

        await output.throw?.(e)

        throw e
      },
      [Symbol.asyncIterator]() {
        return iterator
      },
    }

    return iterator
  }

  private async _call(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<unknown> {
    const clientContext = options.context ?? {} as TClientContext // options.context can be undefined when all field is optional
    const encoded = await this.encode(path, input, options)

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

    if (response.ok) {
      return deserialized
    }

    throw ORPCError.fromJSON(deserialized as any)
  }

  private async encode(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<{
    url: URL
    method: HTTPMethod
    headers: Headers
    body: StandardBody
  }> {
    // clientContext only undefined when context is undefinable so we can safely cast it
    const clientContext = options.context as typeof options.context & { context: TClientContext }
    const expectMethod = await this.getMethod(path, input, clientContext)

    const headers = await this.getHeaders(path, input, clientContext)
    const url = new URL(`${trim(this.url, '/')}/${path.map(encodeURIComponent).join('/')}`)

    headers.append('x-orpc-handler', 'rpc')

    const serialized = this.rpcSerializer.serialize(input)

    if (expectMethod === 'GET' && isObject(serialized)) { // isObject mean has no blobs
      const tryURL = new URL(url)

      tryURL.searchParams.append('data', JSON.stringify(serialized))

      if (tryURL.toString().length <= this.maxURLLength) {
        return {
          body: undefined,
          method: expectMethod,
          headers,
          url: tryURL,
        }
      }
    }

    const method = expectMethod === 'GET' ? this.fallbackMethod : expectMethod

    if (input === undefined) {
      return {
        body: undefined,
        method,
        headers,
        url,
      }
    }

    return {
      body: serialized as StandardBody,
      method,
      headers,
      url,
    }
  }
}
