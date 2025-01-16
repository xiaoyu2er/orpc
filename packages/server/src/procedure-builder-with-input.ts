import type { ContractProcedure, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, RouteOptions, Schema, SchemaOutput } from '@orpc/contract'
import type { ContextGuard } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Context, MergeContext } from './types'
import { ContractProcedureBuilderWithInput, DecoratedContractProcedure } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { DecoratedProcedure } from './procedure-decorated'
import { ProcedureImplementer } from './procedure-implementer'

export interface ProcedureBuilderWithInputDef<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  contract: ContractProcedure<TInputSchema, undefined, TErrorMap>
  middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>>[]
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
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'ProcedureBuilderWithInput' as const
  '~orpc': ProcedureBuilderWithInputDef<TContext, TExtraContext, TInputSchema, TErrorMap>

  constructor(def: ProcedureBuilderWithInputDef<TContext, TExtraContext, TInputSchema, TErrorMap>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilderWithInput<TContext, TExtraContext, TInputSchema, TErrorMap & U> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .errors(errors),
    })
  }

  route(route: RouteOptions): ProcedureBuilderWithInput<TContext, TExtraContext, TInputSchema, TErrorMap> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .route(route),
    })
  }

  use<U extends Context & ContextGuard<MergeContext<TContext, TExtraContext>>>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, U, SchemaOutput<TInputSchema>, unknown, ORPCErrorConstructorMap<TErrorMap>>,
  ): ProcedureBuilderWithInput<TContext, MergeContext<TExtraContext, U>, TInputSchema, TErrorMap>

  use<
    UExtra extends Context & ContextGuard<MergeContext<TContext, TExtraContext>>,
    UInput,
  >(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtra, UInput, unknown, ORPCErrorConstructorMap<TErrorMap>>,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ProcedureBuilderWithInput<TContext, MergeContext<TExtraContext, UExtra>, TInputSchema, TErrorMap>

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

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ProcedureImplementer<TContext, TExtraContext, TInputSchema, U, TErrorMap> {
    return new ProcedureImplementer({
      ...this['~orpc'],
      contract: new ContractProcedureBuilderWithInput(this['~orpc'].contract['~orpc']).output(schema, example),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TContext, TExtraContext, TInputSchema, undefined, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, undefined, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
