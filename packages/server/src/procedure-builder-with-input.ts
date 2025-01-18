import type { ContractProcedure, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, RouteOptions, Schema, SchemaOutput } from '@orpc/contract'
import type { ConflictContextGuard, Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import { ContractProcedureBuilderWithInput, DecoratedContractProcedure } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { DecoratedProcedure } from './procedure-decorated'
import { ProcedureImplementer } from './procedure-implementer'

export interface ProcedureBuilderWithInputDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  __initialContext?: { type: TInitialContext }
  __currentContext?: { type: TCurrentContext }
  contract: ContractProcedure<TInputSchema, undefined, TErrorMap>
  middlewares: Middleware<any, any, any, any, any>[]
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
> {
  '~type' = 'ProcedureBuilderWithInput' as const
  '~orpc': ProcedureBuilderWithInputDef<TInitialContext, TCurrentContext, TInputSchema, TErrorMap>

  constructor(def: ProcedureBuilderWithInputDef<TInitialContext, TCurrentContext, TInputSchema, TErrorMap>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TErrorMap & U> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .errors(errors),
    })
  }

  route(route: RouteOptions): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TErrorMap> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .route(route),
    })
  }

  use<U extends Context>(
    middleware: Middleware<TCurrentContext, U, SchemaOutput<TInputSchema>, unknown, ORPCErrorConstructorMap<TErrorMap>>,
  ): ConflictContextGuard<TCurrentContext & U>
    & ProcedureBuilderWithInput<TInitialContext, TCurrentContext & U, TInputSchema, TErrorMap>

  use<UOutContext extends Context, UInput>(
    middleware: Middleware<TCurrentContext, UOutContext, UInput, unknown, ORPCErrorConstructorMap<TErrorMap>>,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ConflictContextGuard<TCurrentContext & UOutContext> &
    ProcedureBuilderWithInput<TInitialContext, TCurrentContext & UOutContext, TInputSchema, TErrorMap>

  use(
    middleware: Middleware<any, any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureBuilderWithInput<any, any, any, any> {
    const maybeWithMapInput = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    // TODO: order of middleware before/after validation?

    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
      middlewares: [...this['~orpc'].middlewares, maybeWithMapInput],
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ProcedureImplementer<TInitialContext, TCurrentContext, TInputSchema, U, TErrorMap> {
    return new ProcedureImplementer({
      ...this['~orpc'],
      contract: new ContractProcedureBuilderWithInput(this['~orpc'].contract['~orpc']).output(schema, example),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, TInputSchema, undefined, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, undefined, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
