import type { ContractProcedure, ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ConflictContextGuard, Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ANY_MAP_INPUT_MIDDLEWARE, ANY_MIDDLEWARE, MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import { decorateMiddleware } from './middleware-decorated'
import { DecoratedProcedure } from './procedure-decorated'

export type ProcedureImplementerDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> = {
  __initialContext?: { type: TInitialContext }
  __currentContext?: { type: TCurrentContext }
  contract: ContractProcedure<TInputSchema, TOutputSchema, TErrorMap>
  middlewares: Middleware<any, any, any, any, any>[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class ProcedureImplementer<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'ProcedureImplementer' as const
  '~orpc': ProcedureImplementerDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap>

  constructor(def: ProcedureImplementerDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap>) {
    this['~orpc'] = def
  }

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>
    >,
  ): ConflictContextGuard<TCurrentContext & U>
    & ProcedureImplementer<TInitialContext, TCurrentContext & U, TInputSchema, TOutputSchema, TErrorMap>

  use<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ConflictContextGuard<TCurrentContext & UOutContext>
    & ProcedureImplementer<TInitialContext, TCurrentContext & UOutContext, TInputSchema, TOutputSchema, TErrorMap>

  use(
    middleware: ANY_MIDDLEWARE,
    mapInput?: ANY_MAP_INPUT_MIDDLEWARE,
  ): ProcedureImplementer<any, any, any, any, any> {
    const mappedMiddleware = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new ProcedureImplementer({
      ...this['~orpc'],
      middlewares: [...this['~orpc'].middlewares, mappedMiddleware],
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
