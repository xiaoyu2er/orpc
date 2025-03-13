import type { ClientContext, ClientRest } from '@orpc/client'
import type { AnySchema, ErrorMap, InferSchemaInput, InferSchemaOutput, MergedErrorMap, Meta, Route } from '@orpc/contract'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context, ContextExtendsGuard, MergedCurrentContext, MergedInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'
import type { CreateProcedureClientOptions, ProcedureClient } from './procedure-client'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

export class DecoratedProcedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): DecoratedProcedure<
      TInitialContext,
      TCurrentContext,
      TInputSchema,
      TOutputSchema,
      MergedErrorMap<TErrorMap, U>,
      TMeta
    > {
    return new DecoratedProcedure({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  use<UOutContext extends Context, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext,
      UOutContext,
      InferSchemaOutput<TInputSchema>,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ContextExtendsGuard<UInContext, TCurrentContext>
    & ContextExtendsGuard<TCurrentContext, MergedCurrentContext<TCurrentContext, UOutContext>>
    & DecoratedProcedure<
      MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
      MergedCurrentContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  use<UOutContext extends Context, UInput, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext,
      UOutContext,
      UInput,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
    mapInput: MapInputMiddleware<InferSchemaOutput<TInputSchema>, UInput>,
  ): ContextExtendsGuard<UInContext, TCurrentContext>
    & ContextExtendsGuard<TCurrentContext, MergedCurrentContext<TCurrentContext, UOutContext>>
    & DecoratedProcedure<
      MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
      MergedCurrentContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  use(middleware: AnyMiddleware, mapInput?: MapInputMiddleware<any, any>): DecoratedProcedure<any, any, any, any, any, any> {
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
  callable<TClientContext extends ClientContext>(
    ...rest: MaybeOptionalOptions<
      CreateProcedureClientOptions<
        TInitialContext,
        TInputSchema,
        TOutputSchema,
        TErrorMap,
        TMeta,
        TClientContext
      >
    >
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
    & ProcedureClient<TClientContext, TInputSchema, TOutputSchema, TErrorMap> {
    return new Proxy(createProcedureClient(this, ...rest as any), {
      get: (target, key) => {
        return Reflect.has(this, key) ? Reflect.get(this, key) : Reflect.get(target, key)
      },
      has: (target, key) => {
        return Reflect.has(this, key) || Reflect.has(target, key)
      },
    }) as any
  }

  /**
   * Make this procedure compatible with server action (the same as .callable, but the type is compatible with server action).
   */
  actionable<TClientContext extends ClientContext>(
    ...rest: MaybeOptionalOptions<
      CreateProcedureClientOptions<
        TInitialContext,
        TInputSchema,
        TOutputSchema,
        TErrorMap,
        TMeta,
        TClientContext
      >
    >
  ):
    & DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
    & ((...rest: ClientRest<TClientContext, InferSchemaInput<TInputSchema>>) => Promise<InferSchemaOutput<TOutputSchema>>) {
    return this.callable(...rest)
  }
}
