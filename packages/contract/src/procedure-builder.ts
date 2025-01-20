import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions } from './error-map'
import type { HTTPPath, MergeRoute, PrefixRoute, Route, UnshiftTagRoute } from './route'
import type { Schema, SchemaInput, SchemaOutput } from './types'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedContractProcedure } from './procedure-decorated'

export class ContractProcedureBuilder<
  TErrorMap extends ErrorMap,
  TRoute extends Route,
> extends ContractProcedure<undefined, undefined, TErrorMap, TRoute> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractProcedureBuilder<TErrorMap & U, TRoute> {
    const decorated = DecoratedContractProcedure.decorate(this).errors(errors)
    return new ContractProcedureBuilder(decorated['~orpc'])
  }

  route<const U extends Route>(route: U): ContractProcedureBuilder<TErrorMap, MergeRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).route(route)
    return new ContractProcedureBuilder(decorated['~orpc'])
  }

  prefix<U extends HTTPPath>(prefix: U): ContractProcedureBuilder<TErrorMap, PrefixRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).prefix(prefix)
    return new ContractProcedureBuilder(decorated['~orpc'])
  }

  unshiftTag<U extends string[]>(...tags: U): ContractProcedureBuilder<TErrorMap, UnshiftTagRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).unshiftTag(...tags)
    return new ContractProcedureBuilder(decorated['~orpc'])
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): ContractProcedureBuilderWithInput<U, TErrorMap, TRoute> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      InputSchema: schema,
      inputExample: example,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ContractProcedureBuilderWithOutput<U, TErrorMap, TRoute> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      OutputSchema: schema,
      outputExample: example,
    })
  }
}
