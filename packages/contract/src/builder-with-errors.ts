import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { mergeMeta, type Meta } from './meta'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { type HTTPPath, mergeRoute, type Route } from './route'
import { adaptContractRouter, type AdaptedContractRouter, type ContractRouter } from './router'
import { ContractRouterBuilder } from './router-builder'

/**
 * Like `ContractBuilder` except it contains errors,
 * Which is useful when help .router in `ContractBuilder` faster.
 */
export class ContractBuilderWithErrors<
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<undefined, undefined, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractBuilderWithErrors<MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ContractBuilderWithErrors({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): ContractProcedureBuilder<TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ContractProcedureBuilder<TErrorMap, TMeta> {
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

  prefix(prefix: HTTPPath): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractRouterBuilder({
      prefix,
      errorMap: this['~orpc'].errorMap,
      tags: undefined,
    })
  }

  tag(...tags: string[]): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractRouterBuilder({
      tags,
      errorMap: this['~orpc'].errorMap,
      prefix: undefined,
    })
  }

  router<T extends ContractRouter<TMeta>>(
    router: T,
  ): AdaptedContractRouter<T, TErrorMap> {
    return adaptContractRouter(router, this['~orpc'])
  }
}
