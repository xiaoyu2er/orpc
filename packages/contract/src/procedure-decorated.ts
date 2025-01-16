import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions } from './error-map'
import type { RouteOptions } from './procedure'
import type { HTTPPath, Schema } from './types'
import { ContractProcedure } from './procedure'

export class DecoratedContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap> {
  static decorate<UInputSchema extends Schema, UOutputSchema extends Schema, TErrorMap extends ErrorMap>(
    procedure: ContractProcedure<UInputSchema, UOutputSchema, TErrorMap>,
  ): DecoratedContractProcedure<UInputSchema, UOutputSchema, TErrorMap> {
    if (procedure instanceof DecoratedContractProcedure) {
      return procedure
    }

    return new DecoratedContractProcedure(procedure['~orpc'])
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap & U> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  route(route: RouteOptions): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: {
        ...this['~orpc'].route,
        ...route,
      },
    })
  }

  prefix(prefix: HTTPPath): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      ...(this['~orpc'].route?.path
        ? {
            route: {
              ...this['~orpc'].route,
              path: `${prefix}${this['~orpc'].route.path}`,
            },
          }
        : undefined),
    })
  }

  unshiftTag(...tags: string[]): DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: {
        ...this['~orpc'].route,
        tags: [
          ...tags,
          ...this['~orpc'].route?.tags?.filter(tag => !tags.includes(tag)) ?? [],
        ],
      },
    })
  }
}
