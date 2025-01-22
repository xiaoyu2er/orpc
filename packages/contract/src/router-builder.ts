import type { Meta, TypeMeta } from './meta'
import type { HTTPPath } from './route'
import type { MergedPrefix, MergedTags } from './route-utils'
import type { ContractRouter } from './router'
import type { AdaptedContractRouter } from './router-utils'
import { type ErrorMap, type ErrorMapGuard, type ErrorMapSuggestions, type MergedErrorMap, mergeErrorMap, type StrictErrorMap } from './error-map'
import { mergePrefix, mergeTags } from './route-utils'
import { adaptContractRouter } from './router-utils'

export interface ContractRouterBuilderDef<
  TErrorMap extends ErrorMap,
  TPrefix extends HTTPPath | undefined,
  TTags extends readonly string[] | undefined,
  TMetaDef extends Meta,
> {
  __metaDef?: TypeMeta<TMetaDef>
  errorMap: TErrorMap
  prefix: TPrefix
  tags: TTags
}

export class ContractRouterBuilder<
  TErrorMap extends ErrorMap,
  TPrefix extends HTTPPath | undefined,
  TTags extends readonly string[] | undefined,
  TMetaDef extends Meta,
> {
  '~orpc': ContractRouterBuilderDef<TErrorMap, TPrefix, TTags, TMetaDef>

  constructor(def: ContractRouterBuilderDef<TErrorMap, TPrefix, TTags, TMetaDef>) {
    this['~orpc'] = def
  }

  prefix<U extends HTTPPath>(
    prefix: U,
  ): ContractRouterBuilder<TErrorMap, MergedPrefix<TPrefix, U>, TTags, TMetaDef> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    })
  }

  tag<U extends string[]>(
    ...tags: U
  ): ContractRouterBuilder<TErrorMap, TPrefix, MergedTags<TTags, U>, TMetaDef> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    })
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractRouterBuilder<MergedErrorMap<TErrorMap, StrictErrorMap<U>>, TPrefix, TTags, TMetaDef> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  router<T extends ContractRouter<ErrorMap & Partial<TErrorMap>, TMetaDef>>(
    router: T,
  ): AdaptedContractRouter<T, TErrorMap, TPrefix, TTags> {
    return adaptContractRouter(
      router,
      this['~orpc'].errorMap,
      this['~orpc'].prefix,
      this['~orpc'].tags,
    )
  }
}
