import type { ProcedureClient } from '@orpc/server'
import type { Promisable } from '@orpc/shared'
import { ORPCPayloadCodec } from '@orpc/server/fetch'
import { ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE, trim } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'

export interface CreateProcedureClientOptions {
  /**
   * The base url of the server.
   */
  baseURL: string

  /**
   * The fetch function used to make the request.
   * @default global fetch
   */
  fetch?: typeof fetch

  /**
   * The headers used to make the request.
   * Invoked before the request is made.
   */
  headers?: (input: unknown) => Promisable<Headers | Record<string, string>>

  /**
   * The path of the procedure on server.
   */
  path: string[]
}

const payloadCodec = new ORPCPayloadCodec()

export function createProcedureFetchClient<TInput, TOutput>(
  options: CreateProcedureClientOptions,
): ProcedureClient<TInput, TOutput> {
  const client: ProcedureClient<TInput, TOutput> = async (...[input, callerOptions]) => {
    const fetchClient = options.fetch ?? fetch
    const url = `${trim(options.baseURL, '/')}/${options.path.map(encodeURIComponent).join('/')}`

    const encoded = payloadCodec.encode(input)

    const headers = new Headers(encoded.headers)

    headers.append(ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE)

    let customHeaders = await options.headers?.(input)
    customHeaders = customHeaders instanceof Headers ? customHeaders : new Headers(customHeaders)
    for (const [key, value] of customHeaders.entries()) {
      headers.append(key, value)
    }

    const response = await fetchClient(url, {
      method: 'POST',
      headers,
      body: encoded.body,
      signal: callerOptions?.signal,
    })

    const json = await (async () => {
      try {
        return await payloadCodec.decode(response)
      }
      catch (e) {
        throw new ORPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Cannot parse response.',
          cause: e,
        })
      }
    })()

    if (!response.ok) {
      throw (
        ORPCError.fromJSON(json)
        ?? new ORPCError({
          status: response.status,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        })
      )
    }

    return json as any
  }

  return client
}
