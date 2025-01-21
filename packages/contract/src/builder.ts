import type { HTTPPath, MergedRoute, Route, StrictRoute } from './route'
import type { ContractRouter } from './router'
import type { Schema } from './schema'
import { ContractBuilderWithErrors } from './builder-with-errors'
import { createStrictErrorMap, type ErrorMap, type ErrorMapSuggestions, type StrictErrorMap } from './error-map'
import { type MergedMeta, mergeMeta, type Meta, type StrictMeta } from './meta'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { createStrictRoute, mergeRoute } from './route'
import { ContractRouterBuilder } from './router-builder'

export class ContractBuilder<
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> extends ContractProcedure<undefined, undefined, Record<never, never>, TRoute, TMetaDef, TMeta> {
  /**
   * Reset initial meta
   */
  $meta<UDef extends Meta, const UMeta extends UDef>(
    initialMeta: UMeta,
  ): ContractBuilder<TRoute, UDef, StrictMeta<UDef, UMeta>> {
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
  $route<const U extends Route>(
    route: U,
  ): ContractBuilder<StrictRoute<U>, TMetaDef, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      route: createStrictRoute(route),
    })
  }

  errors<const U extends ErrorMap & ErrorMapSuggestions>(
    errors: U,
  ): ContractBuilderWithErrors<StrictErrorMap<U>, TRoute, TMetaDef, TMeta> {
    return new ContractBuilderWithErrors({
      ...this['~orpc'],
      errorMap: createStrictErrorMap(errors),
    })
  }

  meta<const U extends TMetaDef>(
    meta: U,
  ): ContractProcedureBuilder<Record<never, never>, TRoute, TMetaDef, MergedMeta<TMeta, U>> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route<const U extends Route>(
    route: U,
  ): ContractProcedureBuilder<Record<never, never>, MergedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithInput<U, Record<never, never>, TRoute, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithOutput<U, Record<never, never>, TRoute, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  prefix<U extends HTTPPath>(prefix: U): ContractRouterBuilder<Record<never, never>, U, undefined, TMetaDef> {
    return new ContractRouterBuilder({
      prefix,
      errorMap: this['~orpc'].errorMap,
      tags: undefined,
    })
  }

  tag<U extends string[]>(...tags: U): ContractRouterBuilder<Record<never, never>, undefined, U, TMetaDef> {
    return new ContractRouterBuilder({
      tags,
      errorMap: this['~orpc'].errorMap,
      prefix: undefined,
    })
  }

  router<T extends ContractRouter<any, TMetaDef>>(router: T): T {
    return router
  }
}
