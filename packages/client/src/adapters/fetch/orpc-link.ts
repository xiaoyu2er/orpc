import type { ClientOptions, HTTPMethod } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { ClientLink } from '../../types'
import type { FetchWithContext } from './types'
import { ORPCError } from '@orpc/contract'
import { ORPCPayloadCodec, type PublicORPCPayloadCodec } from '@orpc/server/fetch'
import { ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE, trim } from '@orpc/shared'

export interface ORPCLinkOptions<TClientContext> {
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
  method?: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<HTTPMethod | undefined>

  /**
   * The method to use when the payload cannot safely pass to the server with method return from method function.
   * Do not use GET as fallback method, it's very dangerous.
   *
   * @default 'POST'
   */
  fallbackMethod?: HTTPMethod

  headers?: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<Headers | Record<string, string>>

  fetch?: FetchWithContext<TClientContext>

  payloadCodec?: PublicORPCPayloadCodec
}

export class ORPCLink<TClientContext> implements ClientLink<TClientContext> {
  private readonly fetch: FetchWithContext<TClientContext>
  private readonly payloadCodec: PublicORPCPayloadCodec
  private readonly maxURLLength: number
  private readonly fallbackMethod: HTTPMethod
  private readonly getMethod: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<HTTPMethod>
  private readonly getHeaders: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<Headers>
  private readonly url: string

  constructor(options: ORPCLinkOptions<TClientContext>) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.payloadCodec = options.payloadCodec ?? new ORPCPayloadCodec()
    this.maxURLLength = options.maxURLLength ?? 2083
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
    // clientContext only undefined when context is undefinable so we can safely cast it
    const clientContext = options.context as typeof options.context & { context: TClientContext }
    const encoded = await this.encode(path, input, options)

    const response = await this.fetch(encoded.url, {
      method: encoded.method,
      headers: encoded.headers,
      body: encoded.body,
      signal: options.signal,
    }, clientContext)

    const decoded = await this.payloadCodec.decode(response)

    if (!response.ok) {
      if (ORPCError.isValidJSON(decoded)) {
        throw new ORPCError(decoded)
      }

      throw new ORPCError({
        status: response.status,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        cause: decoded,
      })
    }

    return decoded
  }

  private async encode(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<{
    url: URL
    method: HTTPMethod
    headers: Headers
    body: FormData | Blob | string | undefined
  }> {
    // clientContext only undefined when context is undefinable so we can safely cast it
    const clientContext = options.context as typeof options.context & { context: TClientContext }
    const expectMethod = await this.getMethod(path, input, clientContext)
    const methods = new Set([expectMethod, this.fallbackMethod])

    const baseHeaders = await this.getHeaders(path, input, clientContext)
    const baseUrl = new URL(`${trim(this.url, '/')}/${path.map(encodeURIComponent).join('/')}`)

    baseHeaders.append(ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE)

    for (const method of methods) {
      const url = new URL(baseUrl)
      const headers = new Headers(baseHeaders)

      const encoded = this.payloadCodec.encode(input, method, this.fallbackMethod)

      if (encoded.query) {
        for (const [key, value] of encoded.query.entries()) {
          url.searchParams.append(key, value)
        }
      }

      if (url.toString().length > this.maxURLLength) {
        continue
      }

      if (encoded.headers) {
        for (const [key, value] of encoded.headers.entries()) {
          headers.append(key, value)
        }
      }

      return {
        url,
        headers,
        method: encoded.method,
        body: encoded.body,
      }
    }

    throw new ORPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot encode the request, please check the url length or payload.',
    })
  }
}
