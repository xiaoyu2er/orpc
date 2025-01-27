import type { ContractProcedureDef, ErrorMap, MergedErrorMap, Meta, Route, Schema, SchemaInput } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext, TypeCurrentContext, TypeInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { ProcedureBuilderWithoutInputMethods, ProcedureBuilderWithoutOutputMethods } from './procedure-builder-variants'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { addMiddleware } from './middleware-utils'
import { DecoratedProcedure } from './procedure-decorated'

export interface ProcedureBuilderDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class ProcedureBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': ProcedureBuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  constructor(def: ProcedureBuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & ProcedureBuilder<TInitialContext, MergedContext<TCurrentContext, U>, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    const builder = new ProcedureBuilder({
      ...this['~orpc'],
      middlewares: addMiddleware(this['~orpc'].middlewares, middleware),
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
    })

    return builder as any
  }

  input<U extends Schema>(
    schema: U,
  ): ProcedureBuilderWithoutInputMethods<TInitialContext, TCurrentContext, U, TOutputSchema, TErrorMap, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ProcedureBuilderWithoutOutputMethods<TInitialContext, TCurrentContext, TInputSchema, U, TErrorMap, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
