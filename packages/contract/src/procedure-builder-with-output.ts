import type { Meta } from './meta'
import type { HTTPPath, Route } from './route'
import type { Schema } from './schema'
import { type ErrorMap, type ErrorMapGuard, type ErrorMapSuggestions, type MergedErrorMap, mergeErrorMap, type StrictErrorMap } from './error-map'
import { type MergedMeta, mergeMeta } from './meta-utils'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { type MergedRoute, mergeRoute, type PrefixedRoute, prefixRoute, type UnshiftedTagRoute, unshiftTagRoute } from './route-utils'

/**
 * `ContractProcedureBuilderWithOutput` is a branch of `ContractProcedureBuilder` which it has output schema.
 *
 * Why?
 * - prevents override output schema after .output
 */
export class ContractProcedureBuilderWithOutput<
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> extends ContractProcedure<undefined, TOutputSchema, TErrorMap, TRoute, TMetaDef, TMeta> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractProcedureBuilderWithOutput<TOutputSchema, MergedErrorMap<TErrorMap, StrictErrorMap<U>>, TRoute, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta<const U extends TMetaDef>(
    meta: U,
  ): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, TRoute, TMetaDef, MergedMeta<TMeta, U>> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route<const U extends Route>(
    route: U,
  ): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, MergedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  prefix<U extends HTTPPath>(
    prefix: U,
  ): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, PrefixedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      route: prefixRoute(this['~orpc'].route, prefix),
    })
  }

  unshiftTag<U extends string[]>(
    ...tags: U
  ): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, UnshiftedTagRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      route: unshiftTagRoute(this['~orpc'].route, tags),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): DecoratedContractProcedure<U, TOutputSchema, TErrorMap, TRoute, TMetaDef, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }
}
