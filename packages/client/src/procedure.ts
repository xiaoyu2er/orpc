/// <reference lib="dom" />

import {
  ORPC_TRANSFORMER_HEADER,
  type Schema,
  type SchemaInput,
  type SchemaOutput,
  type Transformer,
} from '@orpc/contract'
import { ORPCError, type Promisable } from '@orpc/server'
import { trim } from 'radash'
import SuperJSON from 'superjson'

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

  /**
   * The transformer used to support more data types of the request and response.
   * The transformer must match the transformer used on server.
   *
   * @default SuperJSON
   */
  transformer?: Transformer
}

export function createProcedureClient<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
>(
  options: CreateProcedureClientOptions,
): ProcedureClient<TInputSchema, TOutputSchema, THandlerOutput> {
  const client = async (input: unknown): Promise<unknown> => {
    const fetch_ = options.fetch ?? fetch
    const url = `${trim(options.baseURL, '/')}/.${options.path.join('.')}`
    const transformer: Transformer = options.transformer ?? SuperJSON
    let headers = await options.headers?.(input)
    headers = headers instanceof Headers ? headers : new Headers(headers)

    headers.set('Content-Type', 'application/json')
    headers.set(ORPC_TRANSFORMER_HEADER, '1')

    const response = await fetch_(url, {
      method: 'POST',
      headers: headers,
      body: transformer.stringify(input),
    })

    const text = await response.text()
    const json = text ? transformer.parse(text) : undefined

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
