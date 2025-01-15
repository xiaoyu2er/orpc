import type { ContractProcedure, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ContextGuard } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ANY_MAP_INPUT_MIDDLEWARE, ANY_MIDDLEWARE, MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Context, MergeContext } from './types'
import { decorateMiddleware } from './middleware-decorated'
import { DecoratedProcedure } from './procedure-decorated'

export type ProcedureImplementerDef<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> = {
  contract: ContractProcedure<TInputSchema, TOutputSchema, TErrorMap>
  preMiddlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, any>[]
  postMiddlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, SchemaOutput<TInputSchema>, SchemaInput<TOutputSchema>, any>[]
}

export class ProcedureImplementer<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'ProcedureImplementer' as const
  '~orpc': ProcedureImplementerDef<TContext, TExtraContext, TInputSchema, TOutputSchema, TErrorMap>

  constructor(def: ProcedureImplementerDef<TContext, TExtraContext, TInputSchema, TOutputSchema, TErrorMap>) {
    this['~orpc'] = def
  }

  use<U extends Context & ContextGuard<MergeContext<TContext, TExtraContext>>>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>
    >,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, U>,
    TInputSchema,
    TOutputSchema,
    TErrorMap
  >

  use<
    UExtra extends Context & ContextGuard<MergeContext<TContext, TExtraContext>>,
    UInput,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtra,
      UInput,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, UExtra>,
    TInputSchema,
    TOutputSchema,
    TErrorMap
  >

  use(
    middleware: ANY_MIDDLEWARE,
    mapInput?: ANY_MAP_INPUT_MIDDLEWARE,
  ): ProcedureImplementer<any, any, any, any, any> {
    const mappedMiddleware = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new ProcedureImplementer({
      ...this['~orpc'],
      postMiddlewares: [...this['~orpc'].postMiddlewares, mappedMiddleware],
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      postMiddlewares: this['~orpc'].postMiddlewares,
      preMiddlewares: this['~orpc'].preMiddlewares,
      contract: this['~orpc'].contract,
      handler,
    })
  }
}
