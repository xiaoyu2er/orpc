import type { ContractProcedureBuilder, ContractProcedureBuilderWithInput, ContractProcedureBuilderWithOutput, ContractRouterBuilder } from './builder-variants'
import type { Lazy } from './lazy'
import type { ContractProcedureDef } from './procedure'
import type { ContractRouter } from './router'
import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error'
import { lazy } from './lazy'
import { mergeMeta, type Meta } from './meta'
import { ContractProcedure } from './procedure'
import { type HTTPPath, mergePrefix, mergeRoute, mergeTags, type Route } from './route'
import { enhanceContractRouter, type EnhanceContractRouterOptions, type EnhancedContractRouter } from './router-utils'

export interface ContractBuilderDef<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>, EnhanceContractRouterOptions<TErrorMap> {
}

export class ContractBuilder<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  declare '~orpc': ContractBuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  constructor(def: ContractBuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>) {
    super(def)

    this['~orpc'].prefix = def.prefix
    this['~orpc'].tags = def.tags
  }

  /**
   * Reset initial meta
   */
  $meta<U extends Meta>(
    initialMeta: U,
  ): ContractBuilder<TInputSchema, TOutputSchema, TErrorMap, U> {
    return new ContractBuilder({
      ...this['~orpc'],
      meta: initialMeta,
    })
  }

  /**
   * Reset initial route
   */
  $route(
    initialRoute: Route,
  ): ContractBuilder<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      route: initialRoute,
    })
  }

  errors<U extends ErrorMap>(
    errors: U,
  ): ContractBuilder<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): ContractProcedureBuilder<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    }) as any
  }

  route(
    route: Route,
  ): ContractProcedureBuilder<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithInput<U, TOutputSchema, TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<U extends Schema>(
    schema: U,
  ): ContractProcedureBuilderWithOutput<TInputSchema, U, TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  prefix(
    prefix: HTTPPath,
  ): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    }) as any
  }

  tag(
    ...tags: string[]
  ): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    }) as any
  }

  router<U extends ContractRouter<TMeta>>(
    router: U,
  ): EnhancedContractRouter<U, TErrorMap> {
    return enhanceContractRouter(router, this['~orpc'])
  }

  lazy<U extends ContractRouter<TMeta>>(
    loader: () => Promise<{ default: U }>,
  ): EnhancedContractRouter<Lazy<U>, TErrorMap> {
    const lazied = lazy(loader)
    const adapted = enhanceContractRouter(lazied, this['~orpc'])
    return adapted
  }
}

export const oc = new ContractBuilder({
  errorMap: {},
  inputSchema: undefined,
  outputSchema: undefined,
  route: {},
  meta: {},
  prefix: undefined,
  tags: undefined,
})
