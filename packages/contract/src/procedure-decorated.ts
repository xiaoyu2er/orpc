import type { Meta } from './meta'
import type { MergedMeta } from './meta-utils'
import type { Route } from './route'
import type { MergedRoute } from './route-utils'
import type { Schema } from './schema'
import { type ErrorMap, type ErrorMapGuard, type ErrorMapSuggestions, type MergedErrorMap, mergeErrorMap, type StrictErrorMap } from './error-map'
import { mergeMeta } from './meta-utils'
import { ContractProcedure } from './procedure'
import { mergeRoute } from './route-utils'

export class DecoratedContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TRoute, TMetaDef, TMeta> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, MergedErrorMap<StrictErrorMap<U>, TErrorMap>, TRoute, TMetaDef, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta<const U extends TMetaDef>(
    meta: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TRoute, TMetaDef, MergedMeta<TMeta, U>> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route<const U extends Route>(
    route: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, MergedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }
}
