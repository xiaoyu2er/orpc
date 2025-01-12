import type { Client, ErrorFromErrorMap, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Hooks, Value } from '@orpc/shared'
import type { Lazyable } from './lazy'
import type { ANY_MIDDLEWARE, MiddlewareNextFn, MiddlewareOptions, MiddlewareResult } from './middleware'
import type { ANY_PROCEDURE, Procedure, ProcedureHandlerOptions } from './procedure'
import type { Context, Meta } from './types'
import { ORPCError, validateORPCError, ValidationError } from '@orpc/contract'
import { executeWithHooks, toError, value } from '@orpc/shared'
import { createORPCErrorConstructorMap } from './error'
import { unlazy } from './lazy'
import { middlewareOutputFn } from './middleware'
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
    const errors = createORPCErrorConstructorMap(procedure['~orpc'].contract['~orpc'].errorMap)

    const executeOptions = {
      input,
      context,
      errors,
      path,
      procedure,
      signal: callerOptions?.signal,
    }

    try {
      const output = await executeWithHooks({
        hooks: options,
        input,
        context,
        meta: executeOptions,
        execute: () => executeProcedureInternal(procedure, executeOptions),
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

async function validateInput(procedure: ANY_PROCEDURE, input: unknown): Promise<any> {
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

async function validateOutput(procedure: ANY_PROCEDURE, output: unknown): Promise<any> {
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

function executeMiddlewareChain(middlewares: ANY_MIDDLEWARE[], opt: MiddlewareOptions<any, any, any>, input: any): MiddlewareResult<any, any> {
  let currentIndex = 0
  let currentContext = opt.context

  const executeMiddlewareChain: MiddlewareNextFn<any> = async (nextOptions) => {
    const mid = middlewares[currentIndex]
    currentIndex += 1

    currentContext = mergeContext(currentContext, nextOptions.context)

    if (mid) {
      return await mid({ ...opt, context: currentContext, next: executeMiddlewareChain }, input, middlewareOutputFn)
    }

    // final next must be called with full context
    return opt.next({ context: currentContext })
  }

  return executeMiddlewareChain({})
}

async function executeProcedureInternal(procedure: ANY_PROCEDURE, options: ProcedureHandlerOptions<any, any, any, any>): Promise<any> {
  const executeHandler = async (context: any, input: any) => {
    return await procedure['~orpc'].handler({ ...options, context, input })
  }

  const executePostMiddlewares = async (context: any, input: any) => {
    const validatedInput = await validateInput(procedure, input)

    const result = await executeMiddlewareChain(procedure['~orpc'].postMiddlewares, {
      ...options,
      context,
      next: async ({ context }) => {
        return middlewareOutputFn(
          await executeHandler(context, validatedInput),
        ) as any
      },
    }, validatedInput)

    const validatedOutput = await validateOutput(procedure, result.output)

    return { ...result, output: validatedOutput }
  }

  const result = await executeMiddlewareChain(procedure['~orpc'].preMiddlewares, {
    ...options,
    context: options.context,
    next: ({ context }) => executePostMiddlewares(context, options.input),
  }, options.input)

  return result.output
}
