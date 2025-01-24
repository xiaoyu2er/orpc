import type { Meta } from './meta'
import type { Route } from './route'
import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { mergeMeta } from './meta'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { mergeRoute } from './route'

export class ContractProcedureBuilder<
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<undefined, undefined, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractProcedureBuilder<MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(meta: TMeta): ContractProcedureBuilder<TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(route: Route): ContractProcedureBuilder<TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithInput<U, TErrorMap, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithOutput<U, TErrorMap, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }
}
