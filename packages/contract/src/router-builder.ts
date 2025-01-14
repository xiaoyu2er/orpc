import type { ErrorMap, ErrorMapGuard, ErrorMapSuggestions, StrictErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractRouter } from './router'
import type { HTTPPath } from './types'
import { isContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

export type AdaptedContractRouter<TContract extends ContractRouter<any>, TErrorMapExtra extends ErrorMap> = {
  [K in keyof TContract]: TContract[K] extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrors>
    ? DecoratedContractProcedure<UInputSchema, UOutputSchema, UErrors & TErrorMapExtra>
    : TContract[K] extends ContractRouter<any>
      ? AdaptedContractRouter<TContract[K], TErrorMapExtra>
      : never
}

export interface ContractRouterBuilderDef<TErrorMap extends ErrorMap> {
  prefix?: HTTPPath
  tags?: string[]
  errorMap: TErrorMap
}

export class ContractRouterBuilder<TErrorMap extends ErrorMap> {
  '~type' = 'ContractProcedure' as const
  '~orpc': ContractRouterBuilderDef<TErrorMap>

  constructor(def: ContractRouterBuilderDef<TErrorMap>) {
    this['~orpc'] = def
  }

  prefix(prefix: HTTPPath): ContractRouterBuilder<TErrorMap> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      prefix: `${this['~orpc'].prefix ?? ''}${prefix}`,
    })
  }

  tag(...tags: string[]): ContractRouterBuilder<TErrorMap> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      tags: [...(this['~orpc'].tags ?? []), ...tags],
    })
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): ContractRouterBuilder<U & TErrorMap> {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  router<T extends ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>(router: T): AdaptedContractRouter<T, TErrorMap> {
    if (isContractProcedure(router)) {
      let decorated = DecoratedContractProcedure.decorate(router)

      if (this['~orpc'].tags) {
        decorated = decorated.unshiftTag(...this['~orpc'].tags)
      }

      if (this['~orpc'].prefix) {
        decorated = decorated.prefix(this['~orpc'].prefix)
      }

      if (this['~orpc'].errorMap) {
        /**
         * The `router` (T) has been validated to ensure no conflicts with `TErrorMap`,
         * allowing us to safely cast here.
         */
        decorated = decorated.errors(this['~orpc'].errorMap as any)
      }

      return decorated as any
    }

    const adapted: ContractRouter<TErrorMap> = {}

    for (const key in router) {
      adapted[key] = this.router(router[key]!)
    }

    return adapted as any
  }
}
