import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions } from './error-map'
import type { RouteOptions } from './procedure'
import type { HTTPPath, Schema, SchemaInput } from './types'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

/**
 * `ContractProcedureBuilderWithOutput` is a branch of `ContractProcedureBuilder` which it has output schema.
 *
 * Why?
 * - prevents override output schema after .output
 */
export class ContractProcedureBuilderWithOutput<
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> extends ContractProcedure<undefined, TOutputSchema, TErrorMap> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap & U> {
    const decorated = DecoratedContractProcedure.decorate(this).errors(errors)
    return new ContractProcedureBuilderWithOutput(decorated['~orpc'])
  }

  route(route: RouteOptions): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).route(route)
    return new ContractProcedureBuilderWithOutput(decorated['~orpc'])
  }

  prefix(prefix: HTTPPath): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).prefix(prefix)
    return new ContractProcedureBuilderWithOutput(decorated['~orpc'])
  }

  unshiftTag(...tags: string[]): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).unshiftTag(...tags)
    return new ContractProcedureBuilderWithOutput(decorated['~orpc'])
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, TOutputSchema, TErrorMap> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      InputSchema: schema,
      inputExample: example,
    })
  }
}
