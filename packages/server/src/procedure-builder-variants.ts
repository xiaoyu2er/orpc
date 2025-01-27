import type { ErrorMap, Meta, Schema } from '@orpc/contract'
import type { Context } from './context'
import type { ProcedureBuilderDef } from './procedure-builder'

export interface ProcedureBuilderWithoutInputOutputMethods<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': ProcedureBuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithoutInputMethods<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': ProcedureBuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithoutOutputMethods<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': ProcedureBuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}
