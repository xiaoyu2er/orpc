import type { Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ConflictContextGuard, MergedContext } from './context-utils'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import { type ContractProcedureDef, type ErrorMap, type ErrorMapGuard, type ErrorMapSuggestions, type MergedErrorMap, mergeErrorMap, mergeMeta, mergeRoute, type Meta, type Route, type Schema, type SchemaInput, type SchemaOutput } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { pushMiddlewares } from './middleware-utils'
import { DecoratedProcedure } from './procedure-decorated'

export interface ProcedureBuilderWithoutHandlerDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, Route, TMetaDef, TMetaDef> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
}

/**
 * `ProcedureBuilderWithOutput` is a branch of `ProcedureBuilder` which it only missing handler to be able to build a procedure.
 *
 * Why?
 * - prevents override output schema after .output
 * - allows .use between .input and .output
 * - prevents override input schema after .input
 * - allows .use between .input and .output
 */
export class ProcedureBuilderWithoutHandler<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> {
  '~orpc': ProcedureBuilderWithoutHandlerDef<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMetaDef
  >

  constructor(def: ProcedureBuilderWithoutHandlerDef<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMetaDef
  >) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilderWithoutHandler<
      TInitialContext,
      TCurrentContext,
      TInputSchema,
      TOutputSchema,
      MergedErrorMap<TErrorMap, U>,
      TMetaDef
    > {
    return new ProcedureBuilderWithoutHandler({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMetaDef,
  ): ProcedureBuilderWithoutHandler<
      TInitialContext,
      TCurrentContext,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMetaDef
    > {
    return new ProcedureBuilderWithoutHandler({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ProcedureBuilderWithoutHandler<
      TInitialContext,
      TCurrentContext,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMetaDef
    > {
    return new ProcedureBuilderWithoutHandler({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMetaDef
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & ProcedureBuilderWithoutHandler<
      TInitialContext,
      MergedContext<TCurrentContext, U>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMetaDef
    >

  use<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMetaDef
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>>
    & ProcedureBuilderWithoutHandler<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMetaDef
    >

  use(
    middleware: AnyMiddleware,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureBuilderWithoutHandler<any, any, any, any, any, any> {
    const mappedMiddleware = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new ProcedureBuilderWithoutHandler({
      ...this['~orpc'],
      middlewares: pushMiddlewares(this['~orpc'].middlewares, mappedMiddleware),
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMetaDef>,
  ): DecoratedProcedure<
      TInitialContext,
      TCurrentContext,
      TInputSchema,
      TOutputSchema,
      UFuncOutput,
      TErrorMap,
      Route,
      TMetaDef,
      TMetaDef
    > {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
