import type { Meta } from './meta'
import type { Route } from './route'
import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { mergeMeta } from './meta'
import { ContractProcedure } from './procedure'
import { mergeRoute } from './route'

export class DecoratedContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }
}
