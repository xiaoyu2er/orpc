import type { Meta } from './meta'
import type { Route } from './route'
import type { Schema } from './schema'
import { type ErrorMap, type ErrorMapGuard, type ErrorMapSuggestions, type MergedErrorMap, mergeErrorMap, type StrictErrorMap } from './error-map'
import { type MergedMeta, mergeMeta } from './meta-utils'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { type MergedRoute, mergeRoute } from './route-utils'

/**
 * `ContractProcedureBuilderWithInput` is a branch of `ContractProcedureBuilder` which it has input schema.
 *
 * Why?
 * - prevents override input schema after .input
 */
export class ContractProcedureBuilderWithInput<
  TInputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> extends ContractProcedure<TInputSchema, undefined, TErrorMap, TRoute, TMetaDef, TMeta> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractProcedureBuilderWithInput<TInputSchema, MergedErrorMap<TErrorMap, StrictErrorMap<U>>, TRoute, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta<const U extends TMetaDef>(
    meta: U,
  ): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, TRoute, TMetaDef, MergedMeta<TMeta, U>> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route<const U extends Route>(
    route: U,
  ): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, MergedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  output<U extends Schema>(
    schema: U,
  ): DecoratedContractProcedure<TInputSchema, U, TErrorMap, TRoute, TMetaDef, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }
}
