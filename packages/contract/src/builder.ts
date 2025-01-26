import type { ContractProcedureBuilderWithoutInputMethods, ContractProcedureBuilderWithoutOutputMethods } from './procedure-builder-variants'
import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { mergeMeta, type Meta } from './meta'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { type HTTPPath, mergeRoute, type Route } from './route'
import { adaptContractRouter, type AdaptedContractRouter, type ContractRouter } from './router'
import { ContractRouterBuilder } from './router-builder'

export class ContractBuilder<
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<undefined, undefined, TErrorMap, TMeta> {
  /**
   * Reset initial meta
   */
  $meta<U extends Meta>(
    initialMeta: U,
  ): ContractBuilder<TErrorMap, U> {
    return new ContractBuilder({
      errorMap: this['~orpc'].errorMap,
      inputSchema: this['~orpc'].inputSchema,
      outputSchema: this['~orpc'].outputSchema,
      route: this['~orpc'].route,
      meta: initialMeta,
    })
  }

  /**
   * Reset initial route
   */
  $route(
    initialRoute: Route,
  ): ContractBuilder<TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      route: initialRoute,
    })
  }

  errors<U extends ErrorMap>(
    errors: U,
  ): ContractBuilder<MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): ContractProcedureBuilder<undefined, undefined, TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ContractProcedureBuilder<undefined, undefined, TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithoutInputMethods<U, undefined, TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithoutOutputMethods<undefined, U, TErrorMap, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  prefix(prefix: HTTPPath): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      prefix,
    })
  }

  tag(...tags: string[]): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      tags,
    })
  }

  router<T extends ContractRouter<TMeta>>(router: T): AdaptedContractRouter<T, TErrorMap> {
    return adaptContractRouter(router, this['~orpc'])
  }
}
