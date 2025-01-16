import type { ContractProcedure, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, RouteOptions, Schema, SchemaInput } from '@orpc/contract'
import type { ContextGuard } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Context, MergeContext } from './types'
import { ContractProcedureBuilderWithOutput, DecoratedContractProcedure } from '@orpc/contract'
import { DecoratedProcedure } from './procedure-decorated'
import { ProcedureImplementer } from './procedure-implementer'

export interface ProcedureBuilderWithOutputDef<
  TContext extends Context,
  TExtraContext extends Context,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  contract: ContractProcedure<undefined, TOutputSchema, TErrorMap>
  middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, ORPCErrorConstructorMap<TErrorMap>>[]
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
  TContext extends Context,
  TExtraContext extends Context,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'ProcedureBuilderWithOutput' as const
  '~orpc': ProcedureBuilderWithOutputDef<TContext, TExtraContext, TOutputSchema, TErrorMap>

  constructor(def: ProcedureBuilderWithOutputDef<TContext, TExtraContext, TOutputSchema, TErrorMap>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilderWithOutput<TContext, TExtraContext, TOutputSchema, TErrorMap & U> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .errors(errors),
    })
  }

  route(route: RouteOptions): ProcedureBuilderWithOutput<TContext, TExtraContext, TOutputSchema, TErrorMap> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .route(route),
    })
  }

  use<U extends Context & ContextGuard<MergeContext<TContext, TExtraContext>>>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, U, unknown, SchemaInput<TOutputSchema>, ORPCErrorConstructorMap<TErrorMap>>,
  ): ProcedureBuilderWithOutput<TContext, MergeContext<TExtraContext, U>, TOutputSchema, TErrorMap> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      middlewares: [...this['~orpc'].middlewares, middleware as any],
    })
  }

  input<U extends Schema>(
    schema: U,
    example?: SchemaInput<U>,
  ): ProcedureImplementer<TContext, TExtraContext, U, TOutputSchema, TErrorMap> {
    return new ProcedureImplementer({
      preMiddlewares: this['~orpc'].middlewares,
      postMiddlewares: [],
      contract: new ContractProcedureBuilderWithOutput(this['~orpc'].contract['~orpc']).input(schema, example),
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TContext, TExtraContext, undefined, TOutputSchema, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TContext, TExtraContext, undefined, TOutputSchema, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      preMiddlewares: this['~orpc'].middlewares,
      postMiddlewares: [],
      contract: this['~orpc'].contract,
      handler,
    })
  }
}
