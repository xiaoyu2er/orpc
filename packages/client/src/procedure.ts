/// <reference lib="dom" />

import type { Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import { ORPCError, type Promisable } from '@orpc/server'
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
  baseURL: string
  fetch?: typeof fetch
  headers?: (input: unknown) => Promisable<Headers | Record<string, string>>
  path: string[]
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
    let headers = await options.headers?.(input)
    headers = headers instanceof Headers ? headers : new Headers(headers)

    headers.set('Content-Type', 'application/json')

    const response = await fetch_(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(input),
    })

    const text = await response.text()
    const json = text ? JSON.parse(text) : undefined

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
