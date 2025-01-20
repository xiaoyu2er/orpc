import type { ContractProcedure, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, Route, Schema, SchemaInput } from '@orpc/contract'
import type { ConflictContextGuard, Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import { ContractProcedureBuilderWithOutput, DecoratedContractProcedure } from '@orpc/contract'
import { DecoratedProcedure } from './procedure-decorated'
import { ProcedureImplementer } from './procedure-implementer'

export interface ProcedureBuilderWithOutputDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  contract: ContractProcedure<undefined, TOutputSchema, TErrorMap, Route>
  middlewares: Middleware<any, any, any, any, any>[]
  inputValidationIndex: number
  outputValidationIndex: number
}

/**
 * `ProcedureBuilderWithOutput` is a branch of `ProcedureBuilder` which it has output schema.
 *
 * Why?
 * - prevents override output schema after .output
 * - allows .use between .input and .output
 *
 */
export class ProcedureBuilderWithOutput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'ProcedureBuilderWithOutput' as const
  '~orpc': ProcedureBuilderWithOutputDef<TInitialContext, TCurrentContext, TOutputSchema, TErrorMap>

  constructor(def: ProcedureBuilderWithOutputDef<TInitialContext, TCurrentContext, TOutputSchema, TErrorMap>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TOutputSchema, TErrorMap & U> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .errors(errors),
    })
  }

  route(route: Route): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TOutputSchema, TErrorMap> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .route(route),
    })
  }

  use<U extends Context>(
    middleware: Middleware<TCurrentContext, U, unknown, SchemaInput<TOutputSchema>, ORPCErrorConstructorMap<TErrorMap>>,
  ): ConflictContextGuard<TCurrentContext & U>
    & ProcedureBuilderWithOutput<TInitialContext, TCurrentContext & U, TOutputSchema, TErrorMap> {
    const builder = new ProcedureBuilderWithOutput<TInitialContext, TCurrentContext & U, TOutputSchema, TErrorMap>({
      contract: this['~orpc'].contract,
      outputValidationIndex: this['~orpc'].outputValidationIndex,
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      middlewares: [...this['~orpc'].middlewares, middleware],
    })

    return builder as typeof builder & ConflictContextGuard<TCurrentContext & U>
  }

  input<U extends Schema>(
    schema: U,
    example?: SchemaInput<U>,
  ): ProcedureImplementer<TInitialContext, TCurrentContext, U, TOutputSchema, TErrorMap, Route> {
    return new ProcedureImplementer({
      ...this['~orpc'],
      contract: new ContractProcedureBuilderWithOutput(this['~orpc'].contract['~orpc']).input(schema, example),
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TCurrentContext, undefined, TOutputSchema, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, undefined, TOutputSchema, UFuncOutput, TErrorMap, Route> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
