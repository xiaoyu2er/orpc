import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions, StrictErrorMap } from './error-map'
import type { HTTPPath, MergeRoute, PrefixRoute, Route, UnshiftTagRoute } from './route'
import type { Schema, SchemaOutput } from './types'
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
  TRoute extends Route,
> extends ContractProcedure<TInputSchema, undefined, TErrorMap, TRoute> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractProcedureBuilderWithInput<TInputSchema, StrictErrorMap<U> & TErrorMap, TRoute> {
    const decorated = DecoratedContractProcedure.decorate(this).errors(errors)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
  }

  route<const U extends Route>(route: U): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, MergeRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).route(route)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
  }

  prefix<U extends HTTPPath>(prefix: U): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, PrefixRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).prefix(prefix)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
  }

  unshiftTag<U extends string[]>(...tags: U): ContractProcedureBuilderWithInput<TInputSchema, TErrorMap, UnshiftTagRoute<TRoute, U>> {
    const decorated = DecoratedContractProcedure.decorate(this).unshiftTag(...tags)
    return new ContractProcedureBuilderWithInput(decorated['~orpc'])
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<TInputSchema, U, TErrorMap, TRoute> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      OutputSchema: schema,
      outputExample: example,
    })
  }
}
