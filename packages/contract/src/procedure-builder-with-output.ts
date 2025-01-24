import type { Meta } from './meta'
import type { Route } from './route'
import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { mergeMeta } from './meta'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { mergeRoute } from './route'

/**
 * `ContractProcedureBuilderWithOutput` is a branch of `ContractProcedureBuilder` which it has output schema.
 *
 * Why?
 * - prevents override output schema after .output
 */
export class ContractProcedureBuilderWithOutput<
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<undefined, TOutputSchema, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractProcedureBuilderWithOutput<TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): DecoratedContractProcedure<U, TOutputSchema, TErrorMap, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }
}
