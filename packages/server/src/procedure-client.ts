import type { Client, ErrorFromErrorMap, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Hooks, Value } from '@orpc/shared'
import type { Lazyable } from './lazy'
import type { MiddlewareNextFn } from './middleware'
import type { ANY_PROCEDURE, Procedure, ProcedureHandlerOptions } from './procedure'
import type { Context, Meta } from './types'
import { ORPCError, validateORPCError, ValidationError } from '@orpc/contract'
import { executeWithHooks, toError, value } from '@orpc/shared'
import { createORPCErrorConstructorMap } from './error'
import { unlazy } from './lazy'
import { mergeContext } from './utils'

export type ProcedureClient<
  TClientContext,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
> = Client<TClientContext, SchemaInput<TInputSchema>, SchemaOutput<TOutputSchema, THandlerOutput>, ErrorFromErrorMap<TErrorMap>>

/**
 * Options for creating a procedure caller with comprehensive type safety
 */
export type CreateProcedureClientOptions<
  TContext extends Context,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TClientContext,
> =
  & {
    /**
     * This is helpful for logging and analytics.
     */
    path?: string[]
  }
  & (
    | { context: Value<TContext, [clientContext: TClientContext]> }
    | (undefined extends TContext ? { context?: Value<TContext, [clientContext: TClientContext]> } : never)
  )
  & Hooks<unknown, SchemaOutput<TOutputSchema, THandlerOutput>, TContext, Meta>

export type CreateProcedureClientRest<
  TContext extends Context,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TClientContext,
> =
  | [options: CreateProcedureClientOptions<TContext, TOutputSchema, THandlerOutput, TClientContext>]
  | (undefined extends TContext ? [] : never)

export function createProcedureClient<
  TContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
  TClientContext,
>(
  lazyableProcedure: Lazyable<Procedure<TContext, any, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>>,
  ...[options]: CreateProcedureClientRest<TContext, TOutputSchema, THandlerOutput, TClientContext>
): ProcedureClient<TClientContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
  return async (...[input, callerOptions]) => {
    const path = options?.path ?? []
    const { default: procedure } = await unlazy(lazyableProcedure)
    const context = await value(options?.context, callerOptions?.context) as TContext

    const meta: Meta = {
      path,
      procedure,
      signal: callerOptions?.signal,
    }

    const executeWithValidation = async () => {
      const validInput = await validateInput(procedure, input)

      const output = await executeMiddlewareChain({
        context,
        input: validInput,
        path,
        procedure,
        signal: callerOptions?.signal,
        errors: createORPCErrorConstructorMap(procedure['~orpc'].contract['~orpc'].errorMap),
      })

      return validateOutput(procedure, output) as SchemaOutput<TOutputSchema, THandlerOutput>
    }

    try {
      const output = await executeWithHooks({
        hooks: options,
        input,
        context,
        meta,
        execute: executeWithValidation,
      })

      return output
    }
    catch (e) {
      if (!(e instanceof ORPCError)) {
        throw toError(e)
      }

      const validated = await validateORPCError(procedure['~orpc'].contract['~orpc'].errorMap, e)

      throw validated
    }
  }
}

async function validateInput(procedure: ANY_PROCEDURE, input: unknown) {
  const schema = procedure['~orpc'].contract['~orpc'].InputSchema
  if (!schema)
    return input

  const result = await schema['~standard'].validate(input)
  if (result.issues) {
    throw new ORPCError({
      message: 'Input validation failed',
      code: 'BAD_REQUEST',
      data: {
        issues: result.issues,
      },
      cause: new ValidationError({ message: 'Input validation failed', issues: result.issues }),
    })
  }

  return result.value
}

async function validateOutput(procedure: ANY_PROCEDURE, output: unknown) {
  const schema = procedure['~orpc'].contract['~orpc'].OutputSchema
  if (!schema)
    return output

  const result = await schema['~standard'].validate(output)
  if (result.issues) {
    throw new ORPCError({
      message: 'Output validation failed',
      code: 'INTERNAL_SERVER_ERROR',
      cause: new ValidationError({ message: 'Output validation failed', issues: result.issues }),
    })
  }

  return result.value
}

async function executeMiddlewareChain(opt: ProcedureHandlerOptions<any, any, any, any>) {
  const middlewares = opt.procedure['~orpc'].middlewares ?? []
  let currentMidIndex = 0
  let currentContext = opt.context

  const next: MiddlewareNextFn<any> = async (nextOptions) => {
    const mid = middlewares[currentMidIndex]
    currentMidIndex += 1
    currentContext = mergeContext(currentContext, nextOptions.context)

    if (mid) {
      return await mid({ ...opt, context: currentContext, next }, opt.input, output => ({ output, context: undefined }))
    }

    const result = {
      output: await opt.procedure['~orpc'].handler({ ...opt, context: currentContext }),
      context: currentContext,
    }

    return result
  }

  return (await next({})).output
}
