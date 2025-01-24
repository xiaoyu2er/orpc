import type { ClientPromiseResult, ErrorFromErrorMap, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Context } from './context'
import type { Lazyable } from './lazy'
import type { Procedure } from './procedure'
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
  TInitialContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
>(
  procedure: Lazyable<Procedure<TInitialContext, any, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, any>>,
  input: SchemaInput<TInputSchema>,
  ...rest: CreateProcedureClientRest<TInitialContext, TOutputSchema, THandlerOutput, unknown>
): ClientPromiseResult<SchemaOutput<TOutputSchema, THandlerOutput>, ErrorFromErrorMap<TErrorMap>> {
  return createProcedureClient(procedure, ...rest)(input)
}
