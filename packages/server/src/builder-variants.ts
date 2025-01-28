import type { ErrorMap, Meta, Schema } from '@orpc/contract'
import type { BuilderDef } from './builder'
import type { Context } from './context'

export interface BuilderWithMiddlewares<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ProcedureBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithInput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithOutput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithInputOutput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface RouterBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, any, any, TErrorMap, TMeta>

}
