import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions, StrictErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractRouter } from './router'
import { isContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { type HTTPPath, mergePrefix, type MergePrefix, mergeTags, type MergeTags, type PrefixRoute, type Route, type UnshiftTagRoute } from './route'

export type AdaptRoute<TRoute extends Route, TPrefix extends HTTPPath | undefined, TTags extends readonly string[] | undefined> =
  TPrefix extends HTTPPath
    ? PrefixRoute<TTags extends readonly string[] ? UnshiftTagRoute<TRoute, TTags> : TRoute, TPrefix>
    : TTags extends readonly string[]
      ? UnshiftTagRoute<TRoute, TTags>
      : TRoute

export type AdaptedContractRouter<
  TContract extends ContractRouter<any>,
  TErrorMapExtra extends ErrorMap,
  TPrefix extends HTTPPath | undefined,
  TTags extends readonly string[] | undefined,
> = {
  [K in keyof TContract]: TContract[K] extends
  ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrors, infer URoute>
    ? DecoratedContractProcedure<UInputSchema, UOutputSchema, UErrors & TErrorMapExtra, AdaptRoute<URoute, TPrefix, TTags>>
    : TContract[K] extends ContractRouter<any>
      ? AdaptedContractRouter<TContract[K], TErrorMapExtra, TPrefix, TTags>
      : never
}

export interface ContractRouterBuilderDef<TErrorMap extends ErrorMap, TPrefix extends HTTPPath | undefined, TTags extends readonly string[] | undefined> {
  errorMap: TErrorMap
  prefix: TPrefix
  tags: TTags
}

export class ContractRouterBuilder<TErrorMap extends ErrorMap, TPrefix extends HTTPPath | undefined, TTags extends readonly string[] | undefined> {
  '~type' = 'ContractProcedure' as const
  '~orpc': ContractRouterBuilderDef<TErrorMap, TPrefix, TTags>

  constructor(def: ContractRouterBuilderDef<TErrorMap, TPrefix, TTags>) {
    this['~orpc'] = def
  }

  prefix<U extends HTTPPath>(prefix: U): ContractRouterBuilder<TErrorMap, MergePrefix<TPrefix, U>, TTags> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    })
  }

  tag<U extends string[]>(...tags: U): ContractRouterBuilder<TErrorMap, TPrefix, MergeTags<TTags, U>> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    })
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ContractRouterBuilder<StrictErrorMap<U> & TErrorMap, TPrefix, TTags> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  router<T extends ContractRouter<ErrorMap & Partial<TErrorMap>>>(
    router: T,
  ): AdaptedContractRouter<T, TErrorMap, TPrefix, TTags> {
    if (isContractProcedure(router)) {
      let decorated = DecoratedContractProcedure.decorate(router)

      if (this['~orpc'].tags) {
        decorated = decorated.unshiftTag(...this['~orpc'].tags)
      }

      if (this['~orpc'].prefix) {
        decorated = decorated.prefix(this['~orpc'].prefix)
      }

      /**
       * The `router` (T) has been validated to ensure no conflicts with `TErrorMap`,
       * allowing us to safely cast here.
       */
      decorated = decorated.errors(this['~orpc'].errorMap as any)

      return decorated as any
    }

    const adapted: ContractRouter<TErrorMap> = {}

    for (const key in router) {
      adapted[key] = this.router(router[key]!)
    }

    return adapted as any
  }
}
