/// <reference lib="dom" />

import type { Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import { ORPCError } from '@orpc/server'
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
    const response = await fetch_(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ORPC-Protocol': '1',
      },
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
