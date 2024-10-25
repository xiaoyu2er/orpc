/// <reference lib="dom" />

import {
  ORPC_HEADER,
  ORPC_HEADER_VALUE,
  type Schema,
  type SchemaInput,
  type SchemaOutput,
} from '@orpc/contract'
import { ORPCError, type Promisable } from '@orpc/server'
import { ORPCTransformer } from '@orpc/transformer'
import { trim } from 'radash'

export interface ProcedureClient<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
> {
  (
    input: SchemaInput<TInputSchema>,
  ): Promise<SchemaOutput<TOutputSchema, THandlerOutput>>
}

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
  THandlerOutput extends SchemaOutput<TOutputSchema>,
>(
  options: CreateProcedureClientOptions,
): ProcedureClient<TInputSchema, TOutputSchema, THandlerOutput> {
  const transformer = new ORPCTransformer()

  const client = async (input: unknown): Promise<unknown> => {
    const fetch_ = options.fetch ?? fetch
    const url = `${trim(options.baseURL, '/')}/.${options.path.join('.')}`
    let headers = await options.headers?.(input)
    headers = headers instanceof Headers ? headers : new Headers(headers)

    const { body, headers: headers_ } = transformer.serialize(input)

    for (const key in Object.fromEntries(headers_.entries())) {
      const value = headers_.get(key)!
      headers.set(key, value)
    }

    headers.set(ORPC_HEADER, ORPC_HEADER_VALUE)

    const response = await fetch_(url, {
      method: 'POST',
      headers,
      body,
    })

    const json = await transformer.deserialize(response)

    if (!response.ok) {
      throw (
        ORPCError.fromJSON(json) ??
        new ORPCError({
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
