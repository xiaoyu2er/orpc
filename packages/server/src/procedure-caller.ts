import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Middleware } from './middleware'
import type { Procedure } from './procedure'
import type { Context, Hooks, Meta, Promisable } from './types'
import { ORPCError } from '@orpc/shared/error'
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

  const caller = async (input: unknown): Promise<unknown> => {
    const handler = async (
      input: unknown,
      context: Context,
      partialMeta: Omit<Meta<unknown>, keyof Hooks<unknown>>,
      middlewares: Middleware<any, any, any, any>[],
    ): Promise<unknown> => {
      if (middlewares[0]) {
        const [middleware, ...rest] = middlewares

        return await hook(async (hooks) => {
          const mid = await middleware(input, context, {
            ...partialMeta,
            ...hooks,
          })
          return await handler(
            input,
            mergeContext(context, mid?.context),
            partialMeta,
            rest,
          )
        })
      }

      return await hook(async (hooks) => {
        const output = await procedure.zz$p.handler(input, context, {
          ...partialMeta,
          ...hooks,
        })

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
      })
    }

    return await hook(async (hooks) => {
      options.hooks?.(options.context, {
        ...hooks,
        path,
        procedure,
        internal,
      })

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

      return await handler(
        validInput,
        options.context,
        { path, procedure, internal },
        procedure.zz$p.middlewares ?? [],
      )
    })
  }

  return caller as ProcedureCaller<TProcedure, TValidate>
}
