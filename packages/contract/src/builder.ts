import type { ErrorMap } from './error-map'
import type { ContractRouter } from './router'
import type { Schema } from './schema'
import { ContractBuilderWithErrors } from './builder-with-errors'
import { mergeMeta, type Meta } from './meta'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { type HTTPPath, mergeRoute, type Route } from './route'
import { ContractRouterBuilder } from './router-builder'

export class ContractBuilder<
  TMeta extends Meta,
> extends ContractProcedure<undefined, undefined, Record<never, never>, TMeta> {
  /**
   * Reset initial meta
   */
  $meta<U extends Meta>(
    initialMeta: U,
  ): ContractBuilder<U> {
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
  ): ContractBuilder<TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      route: initialRoute,
    })
  }

  errors<U extends ErrorMap>(
    errors: U,
  ): ContractBuilderWithErrors<U, TMeta> {
    return new ContractBuilderWithErrors({
      ...this['~orpc'],
      errorMap: errors,
    })
  }

  meta(
    meta: TMeta,
  ): ContractProcedureBuilder<Record<never, never>, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ContractProcedureBuilder<Record<never, never>, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithInput<U, Record<never, never>, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithOutput<U, Record<never, never>, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  prefix(prefix: HTTPPath): ContractRouterBuilder<Record<never, never>, TMeta> {
    return new ContractRouterBuilder({
      prefix,
      errorMap: {},
    })
  }

  tag(...tags: string[]): ContractRouterBuilder<Record<never, never>, TMeta> {
    return new ContractRouterBuilder({
      tags,
      errorMap: {},
    })
  }

  router<T extends ContractRouter<TMeta>>(router: T): T {
    return router
  }
}
