import type { Meta } from './meta'
import type { HTTPPath, Route } from './route'
import type { MergedRoute, PrefixedRoute, UnshiftedTagRoute } from './route-utils'
import type { Schema } from './schema'
import { type ErrorMap, type ErrorMapGuard, type ErrorMapSuggestions, type MergedErrorMap, mergeErrorMap, type StrictErrorMap } from './error-map'
import { type MergedMeta, mergeMeta } from './meta-utils'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { mergeRoute, prefixRoute, unshiftTagRoute } from './route-utils'

export class ContractProcedureBuilder<
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> extends ContractProcedure<undefined, undefined, TErrorMap, TRoute, TMetaDef, TMeta> {
  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractProcedureBuilder<MergedErrorMap<TErrorMap, StrictErrorMap<U>>, TRoute, TMetaDef, TMeta> {
    return new ContractProcedureBuilder({
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

  route<const U extends Route>(route: U): ContractProcedureBuilder<TErrorMap, MergedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  prefix<U extends HTTPPath>(prefix: U): ContractProcedureBuilder<TErrorMap, PrefixedRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: prefixRoute(this['~orpc'].route, prefix),
    })
  }

  unshiftTag<U extends string[]>(...tags: U): ContractProcedureBuilder<TErrorMap, UnshiftedTagRoute<TRoute, U>, TMetaDef, TMeta> {
    return new ContractProcedureBuilder({
      ...this['~orpc'],
      route: unshiftTagRoute(this['~orpc'].route, tags),
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
}
