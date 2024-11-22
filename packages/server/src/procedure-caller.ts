import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { MiddlewareMeta } from './middleware'
import type { Procedure } from './procedure'
import type { Context } from './types'
import { ORPCError } from '@orpc/shared/error'
import { mergeContext } from './utils'

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

  const caller = async (input: unknown): Promise<unknown> => {
    const validInput = (() => {
      if (!validate)
        return input
      const schema = procedure.zz$p.contract.zz$cp.InputSchema
      if (!schema)
        return input

      try {
        return schema.parse(input)
      }
      catch (e) {
        throw new ORPCError({
          message: 'Validation input failed',
          code: 'BAD_REQUEST',
          cause: e,
        })
      }
    })()

    const middlewares = procedure.zz$p.middlewares ?? []
    let currentMidIndex = 0
    let currentContext: Context = options.context

    const next: MiddlewareMeta<unknown>['next'] = async (nextOptions) => {
      const mid = middlewares[currentMidIndex]
      currentMidIndex += 1
      currentContext = mergeContext(currentContext, nextOptions.context)

      if (mid) {
        return await mid(validInput, currentContext, {
          path,
          procedure,
          internal,
          next,
          output: output => ({ output, context: undefined }),
        })
      }
      else {
        return {
          output: await await procedure.zz$p.handler(validInput, currentContext, {
            path,
            procedure,
            internal,
          }),
          context: currentContext,
        }
      }
    }

    const output = (await next({})).output

    const validOutput = await (async () => {
      if (!validate)
        return output
      const schema = procedure.zz$p.contract.zz$cp.OutputSchema
      if (!schema)
        return output
      const result = await schema.safeParseAsync(output)
      if (result.error) {
        throw new ORPCError({
          message: 'Validation output failed',
          code: 'INTERNAL_SERVER_ERROR',
          cause: result.error,
        })
      }
      return result.data
    })()

    return validOutput
  }

  return caller as ProcedureCaller<TProcedure, TValidate>
}
