import type { ClientRest, ErrorMap, HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ORPCErrorConstructorMap } from './error'
import type { ANY_MIDDLEWARE, MapInputMiddleware, Middleware } from './middleware'
import type { CreateProcedureClientRest, ProcedureClient } from './procedure-client'
import type { Context, MergeContext } from './types'
import { DecoratedContractProcedure } from '@orpc/contract'
import { createCallableObject } from '@orpc/shared'
import { decorateMiddleware } from './middleware-decorated'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

export class DecoratedProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
> extends Procedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
  static decorate<
    UContext extends Context,
    UExtraContext extends Context,
    UInputSchema extends Schema,
    UOutputSchema extends Schema,
    UHandlerOutput extends SchemaInput<UOutputSchema>,
    UErrorMap extends ErrorMap,
  >(
    procedure: Procedure<UContext, UExtraContext, UInputSchema, UOutputSchema, UHandlerOutput, UErrorMap>,
  ) {
    if (procedure instanceof DecoratedProcedure) {
      return procedure
    }

    return new DecoratedProcedure(procedure['~orpc'])
  }

  prefix(
    prefix: HTTPPath,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: DecoratedContractProcedure.decorate(this['~orpc'].contract).prefix(prefix),
    })
  }

  route(
    route: RouteOptions,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: DecoratedContractProcedure.decorate(this['~orpc'].contract).route(route),
    })
  }

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema, THandlerOutput>,
      ORPCErrorConstructorMap<TErrorMap>
    >,
  ): DecoratedProcedure<
    TContext,
    MergeContext<TExtraContext, U>,
    TInputSchema,
    TOutputSchema,
    THandlerOutput,
    TErrorMap
  >

  use<
    UExtra extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    UInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtra,
      UInput,
      SchemaInput<TOutputSchema, THandlerOutput>,
      ORPCErrorConstructorMap<TErrorMap>
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema, THandlerOutput>, UInput>,
  ): DecoratedProcedure<
    TContext,
    MergeContext<TExtraContext, UExtra>,
    TInputSchema,
    TOutputSchema,
    THandlerOutput,
    TErrorMap
  >

  use(middleware: Middleware<any, any, any, any, any>, mapInput?: MapInputMiddleware<any, any>): DecoratedProcedure<any, any, any, any, any, any> {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new DecoratedProcedure({
      ...this['~orpc'],
      middlewares: [...(this['~orpc'].middlewares ?? []), middleware_],
    })
  }

  unshiftTag(...tags: string[]): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: DecoratedContractProcedure.decorate(this['~orpc'].contract).unshiftTag(...tags),
    })
  }

  unshiftMiddleware<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    ...middlewares: Middleware<
      TContext,
      U,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema, THandlerOutput>,
      ORPCErrorConstructorMap<TErrorMap>
    >[]
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
    // FIXME: this is a hack to make the type checker happy, but it's not a good solution
    const castedMiddlewares = middlewares as ANY_MIDDLEWARE[]

    if (this['~orpc'].middlewares?.length) {
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

    return new DecoratedProcedure({
      ...this['~orpc'],
      middlewares: castedMiddlewares,
    })
  }

  /**
   * Make this procedure callable (works like a function while still being a procedure).
   * **Note**: this only takes effect when this method is called at the end of the chain.
   */
  callable<TClientContext>(...rest: CreateProcedureClientRest<TContext, TOutputSchema, THandlerOutput, TClientContext>):
    & DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>
    & ProcedureClient<TClientContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
    return createCallableObject(this, createProcedureClient(this, ...rest))
  }

  /**
   * Make this procedure compatible with server action (the same as .callable, but the type is compatible with server action).
   * **Note**: this only takes effect when this method is called at the end of the chain.
   */
  actionable<TClientContext>(...rest: CreateProcedureClientRest<TContext, TOutputSchema, THandlerOutput, TClientContext>):
    & DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>
    & ((...rest: ClientRest<TClientContext, SchemaInput<TInputSchema>>) => Promise<SchemaOutput<TOutputSchema, THandlerOutput>>) {
    return this.callable(...rest)
  }
}
