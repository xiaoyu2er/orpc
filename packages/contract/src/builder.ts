import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions, StrictErrorMap } from './error-map'
import type { ContractProcedureDef } from './procedure'
import type { HTTPPath, MergeRoute, Route } from './route'
import type { ContractRouter } from './router'
import type { AdaptedContractRouter } from './router-builder'
import type { Schema, SchemaInput, SchemaOutput } from './types'
import { fallbackContractConfig } from './config'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { ContractRouterBuilder } from './router-builder'

export interface ContractBuilderConfig {
  initialRoute?: Route
}

export type MergeContractBuilderConfig<A extends ContractBuilderConfig, B extends ContractBuilderConfig> = Omit<A, keyof B> & B

export type GetInitialRoute<T extends ContractBuilderConfig> = T['initialRoute'] extends Route
  ? T['initialRoute']
  : Record<never, never>

export interface ContractBuilderDef<TConfig extends ContractBuilderConfig, TErrorMap extends ErrorMap>
  extends ContractProcedureDef<undefined, undefined, TErrorMap, GetInitialRoute<TConfig>> {
  config: TConfig
}

export class ContractBuilder<TConfig extends ContractBuilderConfig, TErrorMap extends ErrorMap>
  extends ContractProcedure<undefined, undefined, TErrorMap, GetInitialRoute<TConfig>> {
  declare '~orpc': ContractBuilderDef<TConfig, TErrorMap>

  constructor(def: ContractBuilderDef<TConfig, TErrorMap>) {
    super(def)
    this['~orpc'].config = def.config
  }

  config<const U extends ContractBuilderConfig>(config: U): ContractBuilder<MergeContractBuilderConfig<TConfig, U>, TErrorMap> {
    return new ContractBuilder({
      ...this['~orpc'],
      config: {
        ...this['~orpc'].config,
        ...config,
      } as any,
    })
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): ContractBuilder<TConfig, U & TErrorMap> {
    return new ContractBuilder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  route<const U extends Route>(route: U): ContractProcedureBuilder<TErrorMap, MergeRoute<GetInitialRoute<TConfig>, U>> {
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

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): ContractProcedureBuilderWithInput<U, TErrorMap, GetInitialRoute<TConfig>> {
    return new ContractProcedureBuilderWithInput({
      route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
      InputSchema: schema,
      inputExample: example,
      OutputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ContractProcedureBuilderWithOutput<U, TErrorMap, GetInitialRoute<TConfig>> {
    return new ContractProcedureBuilderWithOutput({
      route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
      OutputSchema: schema,
      outputExample: example,
      InputSchema: undefined,
      errorMap: this['~orpc'].errorMap,
    })
  }

  prefix<U extends HTTPPath>(prefix: U): ContractRouterBuilder<TErrorMap, U, undefined> {
    return new ContractRouterBuilder({
      prefix,
      errorMap: this['~orpc'].errorMap,
      tags: undefined,
    })
  }

  tag<U extends string[]>(...tags: U): ContractRouterBuilder<TErrorMap, undefined, U> {
    return new ContractRouterBuilder({
      tags,
      errorMap: this['~orpc'].errorMap,
      prefix: undefined,
    })
  }

  router<T extends ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>(
    router: T,
  ): AdaptedContractRouter<T, TErrorMap, undefined, undefined> {
    return new ContractRouterBuilder({
      errorMap: this['~orpc'].errorMap,
      prefix: undefined,
      tags: undefined,
    }).router(router)
  }
}
