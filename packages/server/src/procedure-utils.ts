import type { ClientPromiseResult } from '@orpc/client'
import type { AnyContractProcedure, ErrorFromErrorMap, ErrorMap, Lazy, Lazyable, Meta, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from './context'
import type { CreateProcedureClientOptions } from './procedure-client'
import { getLazyMeta, lazy, unlazy } from '@orpc/contract'
import { type AnyProcedure, isProcedure, Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

export function createAssertedLazyProcedure(lazied: Lazy<any>): Lazy<AnyProcedure> {
  const lazyProcedure = lazy(async () => {
    const { default: maybeProcedure } = await unlazy(lazied)

    if (!isProcedure(maybeProcedure)) {
      throw new Error(`
            Expected a lazy<procedure> but got lazy<unknown>.
            This should be caught by TypeScript compilation.
            Please report this issue if this makes you feel uncomfortable.
        `)
    }

    return { default: maybeProcedure }
  }, getLazyMeta(lazied))

  return lazyProcedure
}

/**
 * Create a new procedure that ensure the contract is applied to the procedure.
 */
export function createContractedProcedure(contract: AnyContractProcedure, procedure: AnyProcedure): AnyProcedure {
  return new Procedure({
    ...procedure['~orpc'],
    errorMap: contract['~orpc'].errorMap,
    route: contract['~orpc'].route,
    meta: contract['~orpc'].meta,
  })
}

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
  THandlerOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
>(
  procedure: Lazyable<Procedure<TInitialContext, any, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta>>,
  input: SchemaInput<TInputSchema>,
  ...rest: MaybeOptionalOptions<
    CreateProcedureClientOptions<
      TInitialContext,
      TInputSchema,
      TOutputSchema,
      THandlerOutput,
      TErrorMap,
      TMeta,
      Record<never, never>
    >
  >
): ClientPromiseResult<SchemaOutput<TOutputSchema, THandlerOutput>, ErrorFromErrorMap<TErrorMap>> {
  return createProcedureClient(procedure, ...rest)(input)
}
