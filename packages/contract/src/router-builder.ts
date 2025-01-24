import type { Meta, TypeMeta } from './meta'
import type { HTTPPath } from './route'
import type { AdaptContractRouterOptions, AdaptedContractRouter, ContractRouter } from './router'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { mergePrefix, mergeTags } from './route'
import { adaptContractRouter } from './router'

export interface ContractRouterBuilderDef<
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends AdaptContractRouterOptions<TErrorMap> {
  __meta?: TypeMeta<TMeta>
}

export class ContractRouterBuilder<
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': ContractRouterBuilderDef<TErrorMap, TMeta>

  constructor(def: ContractRouterBuilderDef<TErrorMap, TMeta>) {
    this['~orpc'] = def
  }

  prefix(
    prefix: HTTPPath,
  ): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    })
  }

  tag(
    ...tags: string[]
  ): ContractRouterBuilder<TErrorMap, TMeta> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    })
  }

  errors<U extends ErrorMap>(
    errors: U,
  ): ContractRouterBuilder<MergedErrorMap<TErrorMap, U>, TMeta> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  router<T extends ContractRouter<TMeta>>(
    router: T,
  ): AdaptedContractRouter<T, TErrorMap> {
    return adaptContractRouter(router, this['~orpc'])
  }
}
