import type { ClientRest, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, MergedErrorMap, Meta, Route, Schema, SchemaInput, SchemaOutput, StrictErrorMap } from '@orpc/contract'
import type { Context } from './context'
import type { ConflictContextGuard, MergedContext } from './context-utils'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'
import type { CreateProcedureClientRest, ProcedureClient } from './procedure-client'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

export class DecoratedProcedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> extends Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, Route, TMetaDef, TMetaDef> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): DecoratedProcedure<
      TInitialContext,
      TCurrentContext,
      TInputSchema,
      TOutputSchema,
      THandlerOutput,
      MergedErrorMap<TErrorMap, StrictErrorMap<U>>,
      TMetaDef
    > {
    return new DecoratedProcedure({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMetaDef,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMetaDef> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMetaDef> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      SchemaOutput<TInputSchema>,
      THandlerOutput,
      ORPCErrorConstructorMap<TErrorMap>,
      TMetaDef
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & DecoratedProcedure<TInitialContext, MergedContext<TCurrentContext, U>, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMetaDef>

  use<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      THandlerOutput,
      ORPCErrorConstructorMap<TErrorMap>,
      TMetaDef
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema, THandlerOutput>, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>>
    & DecoratedProcedure<TInitialContext, MergedContext<TCurrentContext, UOutContext>, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMetaDef>

  use(middleware: AnyMiddleware, mapInput?: MapInputMiddleware<any, any>): DecoratedProcedure<any, any, any, any, any, any, any> {
    const mapped = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new DecoratedProcedure({
      ...this['~orpc'],
      middlewares: addMiddleware(this['~orpc'].middlewares, mapped),
    })
  }

  /**
   * Make this procedure callable (works like a function while still being a procedure).
   */
  callable<TClientContext>(...rest: CreateProcedureClientRest<TInitialContext, TOutputSchema, THandlerOutput, TClientContext>):
    & Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, Route, TMetaDef, TMetaDef>
    & ProcedureClient<TClientContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
    return Object.assign(createProcedureClient(this, ...rest), {
      '~type': 'Procedure' as const,
      '~orpc': this['~orpc'],
    })
  }

  /**
   * Make this procedure compatible with server action (the same as .callable, but the type is compatible with server action).
   */
  actionable<TClientContext>(...rest: CreateProcedureClientRest<TInitialContext, TOutputSchema, THandlerOutput, TClientContext>):
    & Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, Route, TMetaDef, TMetaDef>
    & ((...rest: ClientRest<TClientContext, SchemaInput<TInputSchema>>) => Promise<SchemaOutput<TOutputSchema, THandlerOutput>>) {
    return this.callable(...rest)
  }
}
