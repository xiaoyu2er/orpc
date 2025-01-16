import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions } from './error-map'
import type { RouteOptions } from './procedure'
import type { HTTPPath, Schema, SchemaOutput } from './types'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

/**
 * `ContractProcedureBuilderWithInput` is a branch of `ContractProcedureBuilder` which it has input schema.
 *
 * Why?
 * - prevents override input schema after .input
 */
export class ContractProcedureBuilderWithInput<
  TInputSchema extends Schema,
  TErrorMap extends ErrorMap,
> extends ContractProcedure<TInputSchema, undefined, TErrorMap> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap & U> {
    const decorated = DecoratedContractProcedure.decorate(this).errors(errors)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
  }

  route(route: RouteOptions): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).route(route)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
  }

  prefix(prefix: HTTPPath): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).prefix(prefix)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
  }

  unshiftTag(...tags: string[]): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap> {
    const decorated = DecoratedContractProcedure.decorate(this).unshiftTag(...tags)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<TInputSchema, U, TErrorMap> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      OutputSchema: schema,
      outputExample: example,
    })
  }
}
