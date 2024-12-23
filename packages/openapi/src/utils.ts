import type { ContractRouter, HTTPPath, WELL_CONTRACT_PROCEDURE } from '@orpc/contract'
import type { ANY_LAZY_ROUTER, ANY_ROUTER } from '@orpc/server'
import { isContractProcedure } from '@orpc/contract'
import { flatLazy, getRouterContract, isLazy, isProcedure } from '@orpc/server'

export interface ForEachContractProcedureOptions {
  router: ContractRouter | ANY_ROUTER
  path: string[]
}

export interface ForEachContractProcedureCallbackOptions {
  contract: WELL_CONTRACT_PROCEDURE
  path: string[]
}

export interface PendingLazyRouter {
  router: ANY_LAZY_ROUTER
  path: string[]
}

export function forEachContractProcedure(
  options: ForEachContractProcedureOptions,
  callback: (options: ForEachContractProcedureCallbackOptions) => void,
  result: PendingLazyRouter[] = [],
  isCurrentRouterContract = false,
): PendingLazyRouter[] {
  const hiddenContract = getRouterContract(options.router)

  if (!isCurrentRouterContract && hiddenContract) {
    return forEachContractProcedure(
      {
        path: options.path,
        router: hiddenContract,
      },
      callback,
      result,
      true,
    )
  }

  if (isLazy(options.router)) {
    result.push({
      router: flatLazy(options.router),
      path: options.path,
    })
  }

  //
  else if (isProcedure(options.router)) {
    callback({
      contract: options.router['~orpc'].contract,
      path: options.path,
    })
  }

  //
  else if (isContractProcedure(options.router)) {
    callback({
      contract: options.router,
      path: options.path,
    })
  }

  //
  else {
    for (const key in options.router) {
      forEachContractProcedure(
        {
          router: (options.router as any)[key],
          path: [...options.path, key],
        },
        callback,
        result,
      )
    }
  }

  return result
}

export function standardizeHTTPPath(path: HTTPPath): HTTPPath {
  return `/${path.replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '')}`
}
