import type { Meta } from './meta'
import type { HTTPPath, Route } from './route'
import type { MergedRoute } from './route-utils'
import type { ContractRouter } from './router'
import type { AdaptedContractRouter } from './router-utils'
import type { Schema } from './schema'
import { type ErrorMap, type ErrorMapGuard, type ErrorMapSuggestions, type MergedErrorMap, mergeErrorMap, type StrictErrorMap } from './error-map'
import { type MergedMeta, mergeMeta } from './meta-utils'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { mergeRoute } from './route-utils'
import { ContractRouterBuilder } from './router-builder'
import { adaptContractRouter } from './router-utils'

/**
 * Like `ContractBuilder` except it contains errors,
 * Which is useful when help .router in `ContractBuilder` faster.
 */
export class ContractBuilderWithErrors<
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> extends ContractProcedure<undefined, undefined, TErrorMap, TRoute, TMetaDef, TMeta> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractBuilderWithErrors<MergedErrorMap<TErrorMap, StrictErrorMap<U>>, TRoute, TMetaDef, TMeta> {
    return new ContractBuilderWithErrors({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta<const U extends TMetaDef>(
    meta: U,
  ): ContractProcedureBuilder<TErrorMap, TRoute, TMetaDef, MergedMeta<TMeta, U>> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route<const U extends Route>(
    route: U,
  ): ContractProcedureBuilder<TErrorMap, MergedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithInput<U, TErrorMap, TRoute, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithInput({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithOutput<U, TErrorMap, TRoute, TMetaDef, TMeta> {
    return new ContractProcedureBuilderWithOutput({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  prefix<U extends HTTPPath>(prefix: U): ContractRouterBuilder<TErrorMap, U, undefined, TMetaDef> {
    return new ContractRouterBuilder({
      prefix,
      errorMap: this['~orpc'].errorMap,
      tags: undefined,
    })
  }

  tag<U extends string[]>(...tags: U): ContractRouterBuilder<TErrorMap, undefined, U, TMetaDef> {
    return new ContractRouterBuilder({
      tags,
      errorMap: this['~orpc'].errorMap,
      prefix: undefined,
    })
  }

  router<T extends ContractRouter<ErrorMap & Partial<TErrorMap>, TMetaDef>>(
    router: T,
  ): AdaptedContractRouter<T, TErrorMap, undefined, undefined> {
    return adaptContractRouter(router, this['~orpc'].errorMap, undefined, undefined)
  }
}
