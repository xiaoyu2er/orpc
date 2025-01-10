import type { ContractProcedure, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ORPCErrorConstructorMap } from './error'
import type { ANY_MAP_INPUT_MIDDLEWARE, ANY_MIDDLEWARE, MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { Context, MergeContext } from './types'
import { decorateMiddleware } from './middleware-decorated'
import { Procedure } from './procedure'
import { decorateProcedure } from './procedure-decorated'

export type ProcedureImplementerDef<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> = {
  contract: ContractProcedure<TInputSchema, TOutputSchema, TErrorMap>
  middlewares?: Middleware<
    MergeContext<TContext, TExtraContext>,
    Partial<TExtraContext> | undefined,
    SchemaOutput<TInputSchema>,
    SchemaInput<TOutputSchema>,
    ORPCErrorConstructorMap<TErrorMap>
  >[]
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

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
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
    UExtra extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    UInput = unknown,
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
      middlewares: [...(this['~orpc'].middlewares ?? []), mappedMiddleware],
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap> {
    return decorateProcedure(new Procedure({
      middlewares: this['~orpc'].middlewares,
      contract: this['~orpc'].contract,
      handler,
    }))
  }
}
