import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions, StrictErrorMap } from './error-map'
import type { ContractRouter } from './router'
import type { AdaptedContractRouter } from './router-builder'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'
import { ContractProcedure, type RouteOptions } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { ContractRouterBuilder } from './router-builder'

export type ContractBuilderDef<TErrorMap extends ErrorMap> = {
  errorMap: TErrorMap
}

export class ContractBuilder<TErrorMap extends ErrorMap> extends ContractProcedure<undefined, undefined, TErrorMap> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): ContractBuilder<U & TErrorMap> {
    return new ContractBuilder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  route(route: RouteOptions): ContractProcedureBuilder<TErrorMap> {
    return new ContractProcedureBuilder({
      route,
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): ContractProcedureBuilderWithInput<U, TErrorMap> {
    return new ContractProcedureBuilderWithInput({
      InputSchema: schema,
      inputExample: example,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ContractProcedureBuilderWithOutput<U, TErrorMap> {
    return new ContractProcedureBuilderWithOutput({
      OutputSchema: schema,
      outputExample: example,
      InputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  prefix(prefix: HTTPPath): ContractRouterBuilder<TErrorMap> {
    return new ContractRouterBuilder({
      prefix,
      errorMap: this['~orpc'].errorMap,
    })
  }

  tag(...tags: string[]): ContractRouterBuilder<TErrorMap> {
    return new ContractRouterBuilder({
      tags,
      errorMap: this['~orpc'].errorMap,
    })
  }

  router<T extends ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>(router: T): AdaptedContractRouter<T, TErrorMap> {
    return new ContractRouterBuilder({
      errorMap: this['~orpc'].errorMap,
    }).router(router)
  }
}
