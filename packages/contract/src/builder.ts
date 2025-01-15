import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions, StrictErrorMap } from './error-map'
import type { ContractRouter } from './router'
import type { AdaptedContractRouter } from './router-builder'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'

import { ContractProcedure, type RouteOptions } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
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

  route(route: RouteOptions): DecoratedContractProcedure<undefined, undefined, TErrorMap> {
    return new DecoratedContractProcedure({
      route,
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, undefined, TErrorMap> {
    return new DecoratedContractProcedure({
      InputSchema: schema,
      inputExample: example,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<undefined, U, TErrorMap> {
    return new DecoratedContractProcedure({
      OutputSchema: schema,
      outputExample: example,
      InputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  router<T extends ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>(router: T): AdaptedContractRouter<T, TErrorMap> {
    return new ContractRouterBuilder({
      errorMap: this['~orpc'].errorMap,
    }).router(router)
  }
}
