import type { ContractProcedure, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { ORPCErrorConstructorMap } from './error-map'
import type { Lazy } from './lazy'
import type { Middleware } from './middleware'
import type { AbortSignal, Context, MergeContext } from './types'
import { isContractProcedure } from '@orpc/contract'

export interface ProcedureHandlerOptions<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TErrorMap extends ORPCErrorConstructorMap<any>,
> {
  context: MergeContext<TContext, TExtraContext>
  input: TInput
  path: string[]
  procedure: ANY_PROCEDURE
  signal?: AbortSignal
  errors: TErrorMap
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

export interface ProcedureDef<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
> {
  middlewares?: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, SchemaOutput<TInputSchema>, any>[]
  contract: ContractProcedure<TInputSchema, TOutputSchema, TErrorMap>
  /**
   * Why ErrorMap pass to ProcedureHandler is any?
   * Because if I pass ErrorMap to ProcedureHandler, some error will happen in router... (I don't know why, but it happened)
   * So I decide to pass any to ProcedureHandler.
   * It still fine since, ProcedureDef still can infer ErrorMap from ContractProcedure.
   */
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
