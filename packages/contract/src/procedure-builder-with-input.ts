import type { Meta } from './meta'
import type { Route } from './route'
import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { mergeMeta } from './meta'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { mergeRoute } from './route'

/**
 * `ContractProcedureBuilderWithInput` is a branch of `ContractProcedureBuilder` which it has input schema.
 *
 * Why?
 * - prevents override input schema after .input
 */
export class ContractProcedureBuilderWithInput<
  TInputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, undefined, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractProcedureBuilderWithInput<TInputSchema, MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  output<U extends Schema>(
    schema: U,
  ): DecoratedContractProcedure<TInputSchema, U, TErrorMap, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }
}
