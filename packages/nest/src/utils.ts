import type { AnyContractRouter, HTTPPath } from '@orpc/contract'
import { toHttpPath } from '@orpc/client/standard'
import { ContractProcedure, isContractProcedure } from '@orpc/contract'
import { standardizeHTTPPath } from '@orpc/openapi-client/standard'
import { toArray } from '@orpc/shared'

export function toNestPattern(path: HTTPPath): string {
  return standardizeHTTPPath(path)
    .replace(/\/\{\+([^}]+)\}/g, '/*$1')
    .replace(/\/\{([^}]+)\}/g, '/:$1')
}

export type PopulatedContractRouterPaths<T extends AnyContractRouter> =
    T extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrors, infer UMeta>
      ? ContractProcedure<UInputSchema, UOutputSchema, UErrors, UMeta>
      : {
          [K in keyof T]: T[K] extends AnyContractRouter ? PopulatedContractRouterPaths<T[K]> : never
        }

export interface PopulateContractRouterPathsOptions {
  path?: readonly string[]
}

export function populateContractRouterPaths<T extends AnyContractRouter>(router: T, options: PopulateContractRouterPathsOptions = {}): PopulatedContractRouterPaths<T> {
  if (isContractProcedure(router)) {
    if (router['~orpc'].route.path === undefined) {
      return new ContractProcedure({
        ...router['~orpc'],
        route: {
          ...router['~orpc'].route,
          path: toHttpPath(toArray(options.path)),
        },
      }) as any
    }

    return router as any
  }

  const populated: Record<string, any> = {}

  for (const key in router) {
    populated[key] = populateContractRouterPaths(router[key]!, options)
  }

  return populated as any
}
