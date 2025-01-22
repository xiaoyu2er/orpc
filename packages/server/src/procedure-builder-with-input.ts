import type { ContractProcedureDef, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, MergedErrorMap, Meta, Route, Schema, SchemaOutput } from '@orpc/contract'
import type { Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ConflictContextGuard, MergedContext } from './context-utils'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import { mergeErrorMap, mergeRoute } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { pushMiddlewares } from './middleware-utils'
import { ProcedureBuilderWithoutHandler } from './procedure-builder-without-handler'
import { DecoratedProcedure } from './procedure-decorated'

export interface ProcedureBuilderWithInputDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> extends ContractProcedureDef<TInputSchema, undefined, TErrorMap, Route, TMetaDef, TMetaDef> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
}

/**
 * `ProcedureBuilderWithInput` is a branch of `ProcedureBuilder` which it has input schema.
 *
 * Why?
 * - prevents override input schema after .input
 * - allows .use between .input and .output
 *
 */
export class ProcedureBuilderWithInput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> {
  '~orpc': ProcedureBuilderWithInputDef<TInitialContext, TCurrentContext, TInputSchema, TErrorMap, TMetaDef>

  constructor(def: ProcedureBuilderWithInputDef<TInitialContext, TCurrentContext, TInputSchema, TErrorMap, TMetaDef>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, MergedErrorMap<TErrorMap, U>, TMetaDef> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  route(
    route: Route,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TErrorMap, TMetaDef> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  use<U extends Context>(
    middleware: Middleware<TCurrentContext, U, SchemaOutput<TInputSchema>, unknown, ORPCErrorConstructorMap<TErrorMap>, TMetaDef>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & ProcedureBuilderWithInput<TInitialContext, MergedContext<TCurrentContext, U>, TInputSchema, TErrorMap, TMetaDef>

  use<UOutContext extends Context, UInput>(
    middleware: Middleware<TCurrentContext, UOutContext, UInput, unknown, ORPCErrorConstructorMap<TErrorMap>, TMetaDef>,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    ProcedureBuilderWithInput<TInitialContext, MergedContext<TCurrentContext, UOutContext>, TInputSchema, TErrorMap, TMetaDef>

  use(
    middleware: AnyMiddleware,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureBuilderWithInput<any, any, any, any, any> {
    const maybeWithMapInput = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
      middlewares: pushMiddlewares(this['~orpc'].middlewares, maybeWithMapInput),
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ProcedureBuilderWithoutHandler<TInitialContext, TCurrentContext, TInputSchema, U, TErrorMap, TMetaDef> {
    return new ProcedureBuilderWithoutHandler({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, TInputSchema, undefined, UFuncOutput, TErrorMap, TMetaDef>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, undefined, UFuncOutput, TErrorMap, Route, TMetaDef, TMetaDef> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
