import type { ContractProcedureDef, ErrorMap, Meta, Route, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { Context, TypeInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware } from './middleware'
import type { AbortSignal } from './types'
import { isContractProcedure } from '@orpc/contract'

export interface ProcedureHandlerOptions<
  TCurrentContext extends Context,
  TInput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMetaDef extends Meta,
> {
  context: TCurrentContext
  input: TInput
  path: string[]
  procedure: Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, Route, TMetaDef, TMetaDef>
  signal?: AbortSignal
  errors: TErrorConstructorMap
}

export interface ProcedureHandler<
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> {
  (
    opt: ProcedureHandlerOptions<TCurrentContext, SchemaOutput<TInputSchema>, ORPCErrorConstructorMap<TErrorMap>, TMetaDef>
  ): Promisable<SchemaInput<TOutputSchema, THandlerOutput>>
}

export interface ProcedureDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TRoute, TMetaDef, TMeta> {
  __initialContext?: TypeInitialContext<TInitialContext>
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
  handler: ProcedureHandler<TCurrentContext, any, any, THandlerOutput, any, any>
}

export class Procedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> {
  '~orpc': ProcedureDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TRoute, TMetaDef, TMeta>

  constructor(def: ProcedureDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TRoute, TMetaDef, TMeta>) {
    this['~orpc'] = def
  }
}

export type AnyProcedure = Procedure<any, any, any, any, any, any, any, any, any>

export function isProcedure(item: unknown): item is AnyProcedure {
  if (item instanceof Procedure) {
    return true
  }

  return (
    isContractProcedure(item)
    && 'middlewares' in item['~orpc']
    && 'inputValidationIndex' in item['~orpc']
    && 'outputValidationIndex' in item['~orpc']
    && 'handler' in item['~orpc']
  )
}
