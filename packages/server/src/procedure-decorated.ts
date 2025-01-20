import type { ClientRest, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, Route, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ConflictContextGuard, Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ANY_MIDDLEWARE, MapInputMiddleware, Middleware } from './middleware'
import type { CreateProcedureClientRest, ProcedureClient } from './procedure-client'
import { DecoratedContractProcedure } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

export class DecoratedProcedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
> extends Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TRoute> {
  static decorate<
    UInitialContext extends Context,
    UCurrentContext extends Context,
    UInputSchema extends Schema,
    UOutputSchema extends Schema,
    UHandlerOutput extends SchemaInput<UOutputSchema>,
    UErrorMap extends ErrorMap,
    URoute extends Route,
  >(
    procedure: Procedure<UInitialContext, UCurrentContext, UInputSchema, UOutputSchema, UHandlerOutput, UErrorMap, URoute>,
  ) {
    if (procedure instanceof DecoratedProcedure) {
      return procedure
    }

    return new DecoratedProcedure(procedure['~orpc'])
  }

  prefix(
    prefix: HTTPPath,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, Route> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: DecoratedContractProcedure.decorate(this['~orpc'].contract).prefix(prefix),
    })
  }

  route(
    route: Route,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, Route> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: DecoratedContractProcedure.decorate(this['~orpc'].contract).route(route),
    })
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap & U, TRoute> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: DecoratedContractProcedure.decorate(this['~orpc'].contract).errors(errors),
    })
  }

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      SchemaOutput<TInputSchema>,
      THandlerOutput,
      ORPCErrorConstructorMap<TErrorMap>
    >,
  ): ConflictContextGuard<TCurrentContext & U>
    & DecoratedProcedure<TInitialContext, TCurrentContext & U, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TRoute>

  use<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      THandlerOutput,
      ORPCErrorConstructorMap<TErrorMap>
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema, THandlerOutput>, UInput>,
  ): ConflictContextGuard<TCurrentContext & UOutContext>
    & DecoratedProcedure<TInitialContext, TCurrentContext & UOutContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TRoute>

  use(middleware: Middleware<any, any, any, any, any>, mapInput?: MapInputMiddleware<any, any>): DecoratedProcedure<any, any, any, any, any, any, any> {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new DecoratedProcedure({
      ...this['~orpc'],
      middlewares: [...this['~orpc'].middlewares, middleware_],
    })
  }

  unshiftTag(
    ...tags: string[]
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, Route> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: DecoratedContractProcedure.decorate(this['~orpc'].contract).unshiftTag(...tags),
    })
  }

  unshiftMiddleware<U extends Context>(
    ...middlewares: Middleware<
      TInitialContext,
      U,
      unknown,
      SchemaOutput<TOutputSchema, THandlerOutput>,
      ORPCErrorConstructorMap<TErrorMap>
    >[]
  ): ConflictContextGuard<TInitialContext & U>
    & DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TRoute> {
    // FIXME: this is a hack to make the type checker happy, but it's not a good solution
    const castedMiddlewares = middlewares as ANY_MIDDLEWARE[]

    if (this['~orpc'].middlewares.length) {
      let min = 0

      for (let i = 0; i < this['~orpc'].middlewares.length; i++) {
        const index = castedMiddlewares.indexOf(this['~orpc'].middlewares[i]!, min)

        if (index === -1) {
          castedMiddlewares.push(...this['~orpc'].middlewares.slice(i))
          break
        }

        min = index + 1
      }
    }

    const numNewMiddlewares = castedMiddlewares.length - this['~orpc'].middlewares.length

    const decorated = new DecoratedProcedure({
      ...this['~orpc'],
      inputValidationIndex: this['~orpc'].inputValidationIndex + numNewMiddlewares,
      outputValidationIndex: this['~orpc'].outputValidationIndex + numNewMiddlewares,
      middlewares: castedMiddlewares,
    })

    return decorated as typeof decorated & ConflictContextGuard<TInitialContext & U>
  }

  /**
   * Make this procedure callable (works like a function while still being a procedure).
   */
  callable<TClientContext>(...rest: CreateProcedureClientRest<TInitialContext, TOutputSchema, THandlerOutput, TClientContext>):
    & Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TRoute>
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
    & Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TRoute>
    & ((...rest: ClientRest<TClientContext, SchemaInput<TInputSchema>>) => Promise<SchemaOutput<TOutputSchema, THandlerOutput>>) {
    return this.callable(...rest)
  }
}
