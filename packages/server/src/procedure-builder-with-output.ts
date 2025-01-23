import type { ContractProcedureDef, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, MergedErrorMap, Meta, Route, Schema, SchemaInput, StrictErrorMap } from '@orpc/contract'
import type { Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ConflictContextGuard } from './context-utils'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { addMiddleware } from './middleware-utils'
import { ProcedureBuilderWithoutHandler } from './procedure-builder-without-handler'
import { DecoratedProcedure } from './procedure-decorated'

export interface ProcedureBuilderWithOutputDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> extends ContractProcedureDef<undefined, TOutputSchema, TErrorMap, Route, TMetaDef, TMetaDef> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
}

/**
 * `ProcedureBuilderWithOutput` is a branch of `ProcedureBuilder` which it has output schema.
 *
 * Why?
 * - prevents override output schema after .output
 * - allows .use between .input and .output
 *
 */
export class ProcedureBuilderWithOutput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> {
  '~orpc': ProcedureBuilderWithOutputDef<TInitialContext, TCurrentContext, TOutputSchema, TErrorMap, TMetaDef>

  constructor(def: ProcedureBuilderWithOutputDef<TInitialContext, TCurrentContext, TOutputSchema, TErrorMap, TMetaDef>) {
    this['~orpc'] = def
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TOutputSchema, MergedErrorMap<TErrorMap, StrictErrorMap<U>>, TMetaDef> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMetaDef,
  ): ProcedureBuilderWithOutput<
      TInitialContext,
      TCurrentContext,
      TOutputSchema,
      TErrorMap,
      TMetaDef
    > {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TOutputSchema, TErrorMap, TMetaDef> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  use<U extends Context>(
    middleware: Middleware<TCurrentContext, U, unknown, SchemaInput<TOutputSchema>, ORPCErrorConstructorMap<TErrorMap>, TMetaDef>,
  ): ConflictContextGuard<TCurrentContext & U>
    & ProcedureBuilderWithOutput<TInitialContext, TCurrentContext & U, TOutputSchema, TErrorMap, TMetaDef> {
    const builder = new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      middlewares: addMiddleware(this['~orpc'].middlewares, middleware),
    })

    return builder as any
  }

  input<U extends Schema>(
    schema: U,
  ): ProcedureBuilderWithoutHandler<TInitialContext, TCurrentContext, U, TOutputSchema, TErrorMap, TMetaDef> {
    return new ProcedureBuilderWithoutHandler({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TCurrentContext, undefined, TOutputSchema, UFuncOutput, TErrorMap, TMetaDef>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, undefined, TOutputSchema, UFuncOutput, TErrorMap, TMetaDef> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
