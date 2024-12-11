/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { Caller } from '@orpc/server'
import type { Promisable } from '@orpc/shared'
import {
  ORPC_HEADER,
  ORPC_HEADER_VALUE,
  type Schema,
  type SchemaInput,
  type SchemaOutput,
} from '@orpc/contract'
import { trim } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { ORPCDeserializer, ORPCSerializer } from '@orpc/transformer'

export type ProcedureClient<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
> = Caller<SchemaInput<TInputSchema>, SchemaOutput<TOutputSchema, TFuncOutput>>

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

export function createProcedureClient<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
>(
  options: CreateProcedureClientOptions,
): ProcedureClient<TInputSchema, TOutputSchema, TFuncOutput> {
  const serializer = new ORPCSerializer()
  const deserializer = new ORPCDeserializer()

  const client: Caller<unknown, unknown> = async (...args) => {
    const [input, callerOptions] = args

    const fetch_ = options.fetch ?? fetch
    const url = `${trim(options.baseURL, '/')}/${options.path.map(encodeURIComponent).join('/')}`
    let headers = await options.headers?.(input)
    headers = headers instanceof Headers ? headers : new Headers(headers)

    const { body, headers: headers_ } = serializer.serialize(input)

    for (const [key, value] of headers_.entries()) {
      headers.set(key, value)
    }

    headers.set(ORPC_HEADER, ORPC_HEADER_VALUE)

    const response = await fetch_(url, {
      method: 'POST',
      headers,
      body,
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

    return json
  }

  return client as any
}
