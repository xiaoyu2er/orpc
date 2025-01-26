import type { Meta } from './meta'
import type { ContractProcedureBuilderWithoutInputMethods, ContractProcedureBuilderWithoutOutputMethods } from './procedure-builder-variants'
import type { Route } from './route'
import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { mergeMeta } from './meta'
import { ContractProcedure } from './procedure'
import { mergeRoute } from './route'

export class ContractProcedureBuilder<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractProcedureBuilder<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): ContractProcedureBuilder<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ContractProcedureBuilder<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithoutInputMethods<U, TOutputSchema, TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithoutOutputMethods<TInputSchema, U, TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }
}
