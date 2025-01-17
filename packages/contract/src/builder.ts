import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions, StrictErrorMap } from './error-map'
import type { ContractProcedureDef, RouteOptions } from './procedure'
import type { ContractRouter } from './router'
import type { AdaptedContractRouter } from './router-builder'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { ContractRouterBuilder } from './router-builder'

export interface ContractBuilderConfig {
  initialRoute?: RouteOptions
}

export interface ContractBuilderDef<TErrorMap extends ErrorMap> extends ContractProcedureDef<undefined, undefined, TErrorMap> {
  config: ContractBuilderConfig
}

export class ContractBuilder<TErrorMap extends ErrorMap> extends ContractProcedure<undefined, undefined, TErrorMap> {
  declare '~orpc': ContractBuilderDef<TErrorMap>

  constructor(def: ContractBuilderDef<TErrorMap>) {
    super(def)
  }

  config(config: ContractBuilderConfig): ContractBuilder<TErrorMap> {
    return new ContractBuilder({
      ...this['~orpc'],
      config: {
        ...this['~orpc'].config,
        ...config,
      },
    })
  }

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
      route: {
        ...this['~orpc'].config.initialRoute,
        ...route,
      },
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): ContractProcedureBuilderWithInput<U, TErrorMap> {
    return new ContractProcedureBuilderWithInput({
      route: this['~orpc'].config.initialRoute,
      InputSchema: schema,
      inputExample: example,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ContractProcedureBuilderWithOutput<U, TErrorMap> {
    return new ContractProcedureBuilderWithOutput({
      route: this['~orpc'].config.initialRoute,
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
