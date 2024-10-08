import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import { ORPCError } from './error'
import type { Procedure } from './procedure'
import type { Meta, Promisable } from './types'
import { hook, mergeContext } from './utils'

export interface CreateProcedureCallerOptions<
  TProcedure extends Procedure<any, any, any, any, any>,
  TValidate extends boolean,
> {
  procedure: TProcedure

  /**
   * The context used when calling the procedure.
   */
  context: TProcedure extends Procedure<infer UContext, any, any, any, any>
    ? UContext
    : never

  /**
   * Helpful hooks to do some logics on specific time.
   */
  hooks?: (
    context: TProcedure extends Procedure<infer UContext, any, any, any, any>
      ? UContext
      : never,
    meta: Meta<unknown>,
  ) => Promisable<void>

  /**
   * This is helpful for logging and analytics.
   */
  path?: string[]

  /**
   * This flag helpful when you want bypass some logics not necessary to internal server calls.
   *
   * @default true
   */
  internal?: boolean

  /**
   * Indicate whether validate input and output.
   *
   * @default true
   */
  validate?: TValidate
}

export type ProcedureCaller<
  TProcedure extends Procedure<any, any, any, any, any>,
  TValidate extends boolean,
> = TProcedure extends Procedure<
  any,
  any,
  infer UInputSchema,
  infer UOutputSchema,
  infer UHandlerOutput
>
  ? (
      input: TValidate extends true
        ? SchemaInput<UInputSchema>
        : SchemaOutput<UInputSchema>,
    ) => Promise<
      TValidate extends true
        ? SchemaOutput<UOutputSchema, UHandlerOutput>
        : SchemaInput<UOutputSchema, UHandlerOutput>
    >
  : never

export function createProcedureCaller<
  TProcedure extends Procedure<any, any, any, any, any>,
  TValidate extends boolean = true,
>(
  options: CreateProcedureCallerOptions<TProcedure, TValidate>,
): ProcedureCaller<TProcedure, TValidate> {
  const internal = options.internal ?? true
  const path = options.path ?? []
  const procedure = options.procedure
  const validate = options.validate ?? true

  const caller = async (input: unknown) => {
    return await hook(async (hooks) => {
      const meta: Meta<unknown> = {
        ...hooks,
        path,
        procedure,
        internal,
      }

      options.hooks?.(options.context, meta)

      const validInput = await (async () => {
        if (!validate) return input
        const schema = procedure.zz$p.contract.zz$cp.InputSchema
        if (!schema) return input

        const result = await schema.safeParseAsync(input)
        if (result.error)
          throw new ORPCError({
            message: 'Validation input failed',
            code: 'BAD_REQUEST',
            cause: result.error,
          })
        return result.data
      })()

      let context = options.context

      for (const middleware of procedure.zz$p.middlewares ?? []) {
        const mid = await middleware(validInput, context, meta)
        context = mergeContext(context, mid?.context)
      }

      const output = await procedure.zz$p.handler(validInput, context, meta)

      const validOutput = await (async () => {
        if (!validate) return output
        const schema = procedure.zz$p.contract.zz$cp.OutputSchema
        if (!schema) return output
        const result = await schema.safeParseAsync(output)
        if (result.error)
          throw new ORPCError({
            message: 'Validation output failed',
            code: 'INTERNAL_SERVER_ERROR',
            cause: result.error,
          })
        return result.data
      })()

      return validOutput
    })
  }

  return caller as ProcedureCaller<TProcedure, TValidate>
}
