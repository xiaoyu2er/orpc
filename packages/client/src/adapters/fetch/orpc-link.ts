import type { ClientContext, ClientOptions, HTTPMethod } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { ClientLink } from '../../types'
import type { FetchWithContext } from './types'
import { ORPCError } from '@orpc/contract'
import { isAsyncIteratorObject, type StandardBody } from '@orpc/server-standard'
import { toFetchBody, toStandardBody } from '@orpc/server-standard-fetch'
import { RPCSerializer } from '@orpc/server/standard'
import { trim } from '@orpc/shared'

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
}

export class RPCLink<TClientContext extends ClientContext> implements ClientLink<TClientContext> {
  private readonly fetch: FetchWithContext<TClientContext>
  private readonly rpcSerializer: RPCSerializer
  private readonly maxUrlLength: number
  private readonly fallbackMethod: Exclude<HTTPMethod, 'GET'>
  private readonly getMethod: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<HTTPMethod>
  private readonly getHeaders: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<Headers>
  private readonly url: string

  constructor(options: RPCLinkOptions<TClientContext>) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.rpcSerializer = options.rpcSerializer ?? new RPCSerializer()
    this.maxUrlLength = options.maxUrlLength ?? 2083
    this.fallbackMethod = options.fallbackMethod ?? 'POST'
    this.url = options.url

    this.getMethod = async (path, input, context) => {
      return await options.method?.(path, input, context) ?? this.fallbackMethod
    }

    this.getHeaders = async (path, input, context) => {
      return new Headers(await options.headers?.(path, input, context))
    }
  }

  async call(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<unknown> {
    const clientContext = options.context ?? {} as TClientContext // options.context can be undefined when all field is optional
    const encoded = await this.encode(path, input, options)

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
    const clientContext = options.context ?? {} as TClientContext // options.context can be undefined when all field is optional
    const expectMethod = await this.getMethod(path, input, clientContext)

    const headers = await this.getHeaders(path, input, clientContext)
    const url = new URL(`${trim(this.url, '/')}/${path.map(encodeURIComponent).join('/')}`)

    const serialized = this.rpcSerializer.serialize(input)

    if (
      expectMethod === 'GET'
      && !(serialized instanceof FormData)
      && !isAsyncIteratorObject(serialized)
    ) {
      const getUrl = new URL(url)

      getUrl.searchParams.append('data', JSON.stringify(serialized))

      if (getUrl.toString().length <= this.maxUrlLength) {
        return {
          body: undefined,
          method: expectMethod,
          headers,
          url: getUrl,
        }
      }
    }

    return {
      body: serialized as StandardBody,
      method: expectMethod === 'GET' ? this.fallbackMethod : expectMethod,
      headers,
      url,
    }
  }
}
