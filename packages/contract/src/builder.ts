import type { ContractProcedureBuilder, ContractProcedureBuilderWithInput, ContractProcedureBuilderWithOutput, ContractRouterBuilder } from './builder-variants'
import type { ContractProcedureDef } from './procedure'
import type { AdaptContractRouterOptions, AdaptedContractRouter, ContractRouter } from './router'
import type { Schema } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error'
import { mergeMeta, type Meta } from './meta'
import { ContractProcedure } from './procedure'
import { type HTTPPath, mergePrefix, mergeRoute, mergeTags, type Route } from './route'
import { adaptContractRouter } from './router'

export interface ContractBuilderDef<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>, AdaptContractRouterOptions<TErrorMap> {
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

  prefix(prefix: HTTPPath): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    })
  }

  tag(...tags: string[]): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractBuilder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    })
  }

  router<T extends ContractRouter<TMeta>>(router: T): AdaptedContractRouter<T, TErrorMap> {
    return adaptContractRouter(router, this['~orpc'])
  }
}

export const oc = new ContractBuilder({
  errorMap: {},
  inputSchema: undefined,
  outputSchema: undefined,
  route: {},
  meta: {},
})
