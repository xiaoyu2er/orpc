import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions } from './error-map'
import type { RouteOptions } from './procedure'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedContractProcedure } from './procedure-decorated'

export class ContractProcedureBuilder<
  TErrorMap extends ErrorMap,
> extends ContractProcedure<undefined, undefined, TErrorMap> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): ContractProcedureBuilder< TErrorMap & U> {
    const decorated = DecoratedContractProcedure.decorate(this).errors(errors)
    return new ContractProcedureBuilder(decorated['~orpc'])
  }

  route(route: RouteOptions): ContractProcedureBuilder< TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).route(route)
    return new ContractProcedureBuilder(decorated['~orpc'])
  }

  prefix(prefix: HTTPPath): ContractProcedureBuilder< TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).prefix(prefix)
    return new ContractProcedureBuilder(decorated['~orpc'])
  }

  unshiftTag(...tags: string[]): ContractProcedureBuilder< TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).unshiftTag(...tags)
    return new ContractProcedureBuilder(decorated['~orpc'])
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): ContractProcedureBuilderWithInput<U, TErrorMap> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      InputSchema: schema,
      inputExample: example,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ContractProcedureBuilderWithOutput<U, TErrorMap> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      OutputSchema: schema,
      outputExample: example,
    })
  }
}
