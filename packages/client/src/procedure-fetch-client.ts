import type { ProcedureClient } from '@orpc/server'
import type { Promisable } from '@orpc/shared'
import { ORPC_PROTOCOL_HEADER, ORPC_PROTOCOL_VALUE, trim } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { ORPCDeserializer, ORPCSerializer } from '@orpc/transformer'

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

const serializer = new ORPCSerializer()
const deserializer = new ORPCDeserializer()

export function createProcedureFetchClient<TInput, TOutput>(
  options: CreateProcedureClientOptions,
): ProcedureClient<TInput, TOutput> {
  const client: ProcedureClient<TInput, TOutput> = async (...[input, callerOptions]) => {
    const fetchClient = options.fetch ?? fetch
    const url = `${trim(options.baseURL, '/')}/${options.path.map(encodeURIComponent).join('/')}`

    const headers = new Headers({
      [ORPC_PROTOCOL_HEADER]: ORPC_PROTOCOL_VALUE,
    })

    let customHeaders = await options.headers?.(input)
    customHeaders = customHeaders instanceof Headers ? customHeaders : new Headers(customHeaders)
    for (const [key, value] of customHeaders.entries()) {
      headers.append(key, value)
    }

    const serialized = serializer.serialize(input)

    for (const [key, value] of serialized.headers.entries()) {
      headers.append(key, value)
    }

    const response = await fetchClient(url, {
      method: 'POST',
      headers,
      body: serialized.body,
      signal: callerOptions?.signal,
    })

    const json = await (async () => {
      try {
        return await deserializer.deserialize(response)
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
