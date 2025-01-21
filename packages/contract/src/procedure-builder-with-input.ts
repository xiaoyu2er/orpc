import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions, MergedErrorMap, StrictErrorMap } from './error-map'
import type { MergedMeta, Meta } from './meta'
import type { Schema } from './schema'
import { mergeMeta } from './meta'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { type HTTPPath, type MergedRoute, mergeRoute, type PrefixedRoute, prefixRoute, type Route, type UnshiftedTagRoute, unshiftTagRoute } from './route'

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
    const decorated = DecoratedContractProcedure.decorate(this).errors(errors)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
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

  prefix<U extends HTTPPath>(
    prefix: U,
  ): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, PrefixedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      route: prefixRoute(this['~orpc'].route, prefix),
    })
  }

  unshiftTag<U extends string[]>(
    ...tags: U
  ): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, UnshiftedTagRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      route: unshiftTagRoute(this['~orpc'].route, tags),
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
