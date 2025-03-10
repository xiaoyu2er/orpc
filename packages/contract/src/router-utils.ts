import type { AnyContractRouter } from './router'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error'
import { ContractProcedure, isContractProcedure } from './procedure'
import { enhanceRoute, type EnhanceRouteOptions } from './route'

export type EnhancedContractRouter<T extends AnyContractRouter, TErrorMap extends ErrorMap> =
    T extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrors, infer UMeta>
      ? ContractProcedure<UInputSchema, UOutputSchema, MergedErrorMap<TErrorMap, UErrors>, UMeta>
      : {
          [K in keyof T]: T[K] extends AnyContractRouter ? EnhancedContractRouter<T[K], TErrorMap> : never
        }

export interface EnhanceContractRouterOptions<TErrorMap extends ErrorMap> extends EnhanceRouteOptions {
  errorMap: TErrorMap
}

export function enhanceContractRouter<T extends AnyContractRouter, TErrorMap extends ErrorMap>(
  router: T,
  options: EnhanceContractRouterOptions<TErrorMap>,
): EnhancedContractRouter<T, TErrorMap> {
  if (isContractProcedure(router)) {
    const enhanced = new ContractProcedure({
      ...router['~orpc'],
      errorMap: mergeErrorMap(options.errorMap, router['~orpc'].errorMap),
      route: enhanceRoute(router['~orpc'].route, options),
    })

    return enhanced as any
  }

  const enhanced: Record<string, any> = {}

  for (const key in router) {
    enhanced[key] = enhanceContractRouter(router[key]!, options)
  }

  return enhanced as any
}
