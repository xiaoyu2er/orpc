import type { ErrorMap, ErrorMapGuard } from './error-map'
import type { RouteOptions } from './procedure'
import type { HTTPPath, PreventNever, Schema, SchemaInput, SchemaOutput } from './types'
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

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, TOutputSchema, TErrorMap> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      InputSchema: schema,
      inputExample: example,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<TInputSchema, U, TErrorMap> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      OutputSchema: schema,
      outputExample: example,
    })
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap>>(errors: U): PreventNever<TErrorMap & U> & DecoratedContractProcedure<TInputSchema, TOutputSchema, TErrorMap & U> {
    const decorated = new DecoratedContractProcedure({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })

    return decorated as typeof decorated & PreventNever<TErrorMap & U>
  }
}
