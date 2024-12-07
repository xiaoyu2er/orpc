import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { PartialOnUndefinedDeep, Value } from '@orpc/shared'
import type { Lazy } from './lazy'
import type { MiddlewareMeta } from './middleware'
import type { Context } from './types'
import { trim, value } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { isLazy, loadLazy } from './lazy'
import { type ANY_LAZY_PROCEDURE, type ANY_PROCEDURE, isProcedure, type Procedure } from './procedure'
import { mergeContext } from './utils'

export type CreateProcedureCallerOptions<
  TProcedure extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE,
> = {
  procedure: TProcedure

  /**
   * This is helpful for logging and analytics.
   *
   * @internal
   */
  path?: string[]
} & PartialOnUndefinedDeep<{
  /**
   * The context used when calling the procedure.
   */
  context: Value<
    TProcedure extends Procedure<infer UContext, any, any, any, any> | Lazy<Procedure<infer UContext, any, any, any, any>>
      ? UContext
      : never
  >
}>

export type ProcedureCaller<
  TProcedure extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE,
> = TProcedure extends
| Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput >
| Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput >>
  ? (
      ...input: [input: SchemaInput<UInputSchema>] | (undefined extends SchemaInput<UInputSchema> ? [] : never)
    ) => Promise<
      SchemaOutput<UOutputSchema, UFuncOutput>
    >
  : never

export function createProcedureCaller<
  TProcedure extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE,
>(
  options: CreateProcedureCallerOptions<TProcedure>,
): ProcedureCaller<TProcedure> {
  const caller = async (input: unknown): Promise<unknown> => {
    const path = options.path ?? []
    const procedure = await loadProcedure(options.procedure)

    const validInput = (() => {
      const schema = procedure.zz$p.contract.zz$cp.InputSchema
      if (!schema) {
        return input
      }

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
    let currentContext: Context = await value(options.context)

    const next: MiddlewareMeta<unknown>['next'] = async (nextOptions) => {
      const mid = middlewares[currentMidIndex]
      currentMidIndex += 1
      currentContext = mergeContext(currentContext, nextOptions.context)

      if (mid) {
        return await mid(validInput, currentContext, {
          path,
          procedure,
          next,
          output: output => ({ output, context: undefined }),
        })
      }
      else {
        return {
          output: await await procedure.zz$p.func(validInput, currentContext, {
            path,
            procedure,
          }),
          context: currentContext,
        }
      }
    }

    const output = (await next({})).output

    const validOutput = await (async () => {
      const schema = procedure.zz$p.contract.zz$cp.OutputSchema
      if (!schema) {
        return output
      }

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

  return caller as ProcedureCaller<TProcedure>
}

export async function loadProcedure(procedure: ANY_PROCEDURE | ANY_LAZY_PROCEDURE): Promise<ANY_PROCEDURE> {
  let loadedProcedure: ANY_PROCEDURE

  if (isLazy(procedure)) {
    loadedProcedure = (await loadLazy(procedure)).default
  }
  else {
    loadedProcedure = procedure
  }

  if (!isProcedure(loadedProcedure)) {
    throw new ORPCError({
      code: 'NOT_FOUND',
      message: 'Not found',
      cause: new Error(trim(`
          This error should be caught by the typescript compiler.
          But if you still see this error, it means that you trying to call a lazy router (expected to be a lazy procedure).
        `)),
    })
  }

  return loadedProcedure
}
