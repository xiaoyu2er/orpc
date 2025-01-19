import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions } from './error-map'
import type { HTTPPath, MergeRoute, PrefixRoute, Route, UnshiftTagRoute } from './route'
import type { Schema } from './types'
import { ContractProcedure } from './procedure'

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

  route<U extends Route>(
    route: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, MergeRoute<TRoute, U>> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: {
        ...this['~orpc'].route,
        ...route,
      },
    })
  }

  prefix<U extends HTTPPath>(
    prefix: U,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, PrefixRoute<TRoute, U>> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      ...(this['~orpc'].route.path
        ? {
            route: {
              ...this['~orpc'].route,
              path: `${prefix}${this['~orpc'].route.path}`,
            } as any,
          }
        : undefined),
    })
  }

  unshiftTag<U extends string[]>(
    ...tags: U
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap, UnshiftTagRoute<TRoute, U>> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: {
        ...this['~orpc'].route,
        tags: [
          ...tags,
          ...this['~orpc'].route?.tags?.filter(tag => !tags.includes(tag)) ?? [],
        ] as any,
      },
    })
  }
}
