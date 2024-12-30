import type { HTTPMethod } from '@orpc/contract'
import type { ProcedureClientOptions } from '@orpc/server'
import type { Promisable } from '@orpc/shared'
import type { ClientLink } from '../../types'
import type { FetchWithContext } from './types'
import { ORPCPayloadCodec, type PublicORPCPayloadCodec } from '@orpc/server/fetch'
import { ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE, trim } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'

export interface ORPCLinkOptions<TClientContext> {
  url: string
  method?: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<HTTPMethod | undefined>
  headers?: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<Headers | Record<string, string>>
  fetch?: FetchWithContext<TClientContext>
  payloadCodec?: PublicORPCPayloadCodec
}

export class ORPCLink<TClientContext> implements ClientLink<TClientContext> {
  private readonly fetch: FetchWithContext<TClientContext>
  private readonly payloadCodec: PublicORPCPayloadCodec

  constructor(private readonly options: ORPCLinkOptions<TClientContext>) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.payloadCodec = options.payloadCodec ?? new ORPCPayloadCodec()
  }

  async call(path: readonly string[], input: unknown, options: ProcedureClientOptions<TClientContext>): Promise<unknown> {
    const clientContext = options.context as typeof options.context & { context: TClientContext }

    const url = new URL(`${trim(this.options.url, '/')}/${path.map(encodeURIComponent).join('/')}`)
    const method = await this.options.method?.(path, input, clientContext) ?? 'POST'
    const encoded = this.payloadCodec.encode(input, method)

    if (encoded.query) {
      for (const [key, value] of encoded.query.entries()) {
        url.searchParams.append(key, value)
      }
    }

    const headers = new Headers(encoded.headers)

    headers.append(ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE)

    // clientContext only undefined when context is undefinable so we can safely cast it

    let customHeaders = await this.options.headers?.(path, input, clientContext)
    customHeaders = customHeaders instanceof Headers ? customHeaders : new Headers(customHeaders)
    for (const [key, value] of customHeaders.entries()) {
      headers.append(key, value)
    }

    const response = await this.fetch(url, {
      method,
      headers,
      body: encoded.body,
      signal: options.signal,
    }, clientContext)

    const decoded = await this.payloadCodec.decode(response)

    if (!response.ok) {
      const error = ORPCError.fromJSON(decoded) ?? new ORPCError({
        status: response.status,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        cause: decoded,
      })

      throw error
    }

    return decoded
  }
}
