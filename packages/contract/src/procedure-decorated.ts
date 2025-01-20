import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions } from './error-map'
import type { Schema } from './types'
import { ContractProcedure } from './procedure'
import { type HTTPPath, mergeRoute, type MergeRoute, prefixRoute, type PrefixRoute, type Route, unshiftTagRoute, type UnshiftTagRoute } from './route'

export class DecoratedContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TRoute> {
  static decorate<
    UInputSchema extends Schema,
    UOutputSchema extends Schema,
    UErrorMap extends ErrorMap,
    URoute extends Route,
  >(
    procedure: ContractProcedure<UInputSchema, UOutputSchema, UErrorMap, URoute>,
  ): DecoratedContractProcedure<UInputSchema, UOutputSchema, UErrorMap, URoute> {
    if (procedure instanceof DecoratedContractProcedure) {
      return procedure
    }

    return new DecoratedContractProcedure(procedure['~orpc'])
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap & U, TRoute> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  route<const U extends Route>(
    route: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, MergeRoute<TRoute, U>> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  prefix<U extends HTTPPath>(
    prefix: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, PrefixRoute<TRoute, U>> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: prefixRoute(this['~orpc'].route, prefix),
    })
  }

  unshiftTag<U extends string[]>(
    ...tags: U
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, UnshiftTagRoute<TRoute, U>> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: unshiftTagRoute(this['~orpc'].route, tags),
    })
  }
}
