import type { ContractProcedure, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { ORPCErrorConstructorMap } from './error'
import type { Lazy } from './lazy'
import type { Middleware } from './middleware'
import type { AbortSignal, Context, MergeContext } from './types'
import { isContractProcedure } from '@orpc/contract'

export interface ProcedureHandlerOptions<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
> {
  context: MergeContext<TContext, TExtraContext>
  input: TInput
  path: string[]
  procedure: ANY_PROCEDURE
  signal?: AbortSignal
  errors: TErrorConstructorMap
}

export interface ProcedureHandler<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
> {
  (
    opt: ProcedureHandlerOptions<TContext, TExtraContext, SchemaOutput<TInputSchema>, ORPCErrorConstructorMap<TErrorMap>>
  ): Promisable<SchemaInput<TOutputSchema, THandlerOutput>>
}

/**
 * Why is `ErrorConstructorMap` passed to `pre/postMiddlewares` as `any`?
 * Why is `ErrorMap` passed to `ProcedureHandler` as `any`?
 *
 * Passing `ErrorMap/ErrorConstructorMap` directly to `Middleware/ProcedureHandler`
 * causes unexpected errors in the router (the root cause is unclear, but it occurs consistently).
 * To avoid these issues, `any` is used as a workaround.
 *
 * This approach is still functional because `ProcedureDef` can infer the `ErrorMap` from `ContractProcedure`.
 * The only downside is that direct access to them requires careful type checking to ensure safety.
 */
export interface ProcedureDef<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
> {
  preMiddlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, any>[]
  postMiddlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, SchemaOutput<TInputSchema>, SchemaInput<TOutputSchema>, any>[]
  contract: ContractProcedure<TInputSchema, TOutputSchema, TErrorMap>
  handler: ProcedureHandler<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, any>
}

export class Procedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'Procedure' as const
  '~orpc': ProcedureDef<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>

  constructor(def: ProcedureDef<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>) {
    this['~orpc'] = def
  }
}

export type ANY_PROCEDURE = Procedure<any, any, any, any, any, any>
export type WELL_PROCEDURE = Procedure<Context, Context, Schema, Schema, unknown, any>
export type ANY_LAZY_PROCEDURE = Lazy<ANY_PROCEDURE>

export function isProcedure(item: unknown): item is ANY_PROCEDURE {
  if (item instanceof Procedure) {
    return true
  }

  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && '~type' in item
    && item['~type'] === 'Procedure'
    && '~orpc' in item
    && typeof item['~orpc'] === 'object'
    && item['~orpc'] !== null
    && 'contract' in item['~orpc']
    && isContractProcedure(item['~orpc'].contract)
    && 'handler' in item['~orpc']
    && typeof item['~orpc'].handler === 'function'
  )
}
