import type { ClientPromiseResult, ErrorFromErrorMap, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Lazyable } from './lazy'
import type { Procedure } from './procedure'
import type { Context } from './types'
import { createProcedureClient, type CreateProcedureClientRest } from './procedure-client'

/**
 * Directly call a procedure without creating a client.
 *
 * @example
 * ```ts
 * const output = await call(getting, 'input')
 * const output = await call(getting, 'input', { context: { db: 'postgres' } })
 * ```
 *
 */
export function call<
  TContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
>(
  procedure: Lazyable<Procedure<TContext, any, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>>,
  input: SchemaInput<TInputSchema>,
  ...rest: CreateProcedureClientRest<TContext, TOutputSchema, THandlerOutput>
): ClientPromiseResult<SchemaOutput<TOutputSchema, THandlerOutput>, ErrorFromErrorMap<TErrorMap>> {
  return createProcedureClient(procedure, ...rest)(input)
}
