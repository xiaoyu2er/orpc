import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions } from './error-map'
import type { HTTPPath, MergeRoute, PrefixRoute, Route, UnshiftTagRoute } from './route'
import type { Schema, SchemaInput } from './types'
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
  TRoute extends Route,
> extends ContractProcedure<undefined, TOutputSchema, TErrorMap, TRoute> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap & U, TRoute> {
    const decorated = DecoratedContractProcedure.decorate(this).errors(errors)
    return new ContractProcedureBuilderWithOutput(decorated['~orpc'])
  }

  route<const U extends Route>(route: U): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, MergeRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).route(route)
    return new ContractProcedureBuilderWithOutput(decorated['~orpc'])
  }

  prefix<U extends HTTPPath>(prefix: U): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, PrefixRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).prefix(prefix)
    return new ContractProcedureBuilderWithOutput(decorated['~orpc'])
  }

  unshiftTag<U extends string[]>(...tags: U): ContractProcedureBuilderWithOutput<TOutputSchema, TErrorMap, UnshiftTagRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).unshiftTag(...tags)
    return new ContractProcedureBuilderWithOutput(decorated['~orpc'])
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, TOutputSchema, TErrorMap, TRoute> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      InputSchema: schema,
      inputExample: example,
    })
  }
}
