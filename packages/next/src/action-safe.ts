import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE, CreateProcedureCallerOptions, Lazy, Procedure, WELL_ORPC_ERROR_JSON } from '@orpc/server'
import { createProcedureClient, ORPCError } from '@orpc/server'

export type SafeAction<T extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE> = T extends
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
  ? (
      ...options:
        | [input: SchemaInput<UInputSchema>]
        | (undefined extends SchemaInput<UInputSchema> ? [] : never)
    ) => Promise<
      | [SchemaOutput<UOutputSchema, UFuncOutput>, undefined, 'success']
      | [undefined, WELL_ORPC_ERROR_JSON, 'error']
    >
  : never

export function createSafeAction<T extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE>(opt: CreateProcedureCallerOptions<T>): SafeAction<T> {
  const caller = createProcedureClient(opt)

  const safeAction = async (...input: [any] | []) => {
    try {
      const output = await caller(...input)
      return [output as any, undefined, 'success']
    }
    catch (e) {
      const error = convertToORPCError(e)

      return [undefined, error.toJSON(), 'error']
    }
  }

  return safeAction as any
}

function convertToORPCError(e: unknown): ORPCError<any, any> {
  if (e instanceof ORPCError) {
    return e
  }

  return new ORPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    cause: e,
  })
}
