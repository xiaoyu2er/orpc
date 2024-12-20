import type { ContractRouter, HTTPPath, WELL_CONTRACT_PROCEDURE } from '@orpc/contract'
import type { ANY_PROCEDURE, ANY_ROUTER, Lazy } from '@orpc/server'
import { isContractProcedure } from '@orpc/contract'
import { flatLazy, getRouterContract, isLazy, isProcedure } from '@orpc/server'

export interface EachLeafOptions {
  router: ContractRouter | ANY_ROUTER
  path: string[]
}

export interface EachLeafCallbackOptions {
  contract: WELL_CONTRACT_PROCEDURE
  path: string[]
}

export interface EachContractLeafResultItem {
  lazy: Lazy<ANY_PROCEDURE> | Lazy<Record<string, ANY_ROUTER>>
  path: string[]
}

export function eachContractProcedureLeaf(
  options: EachLeafOptions,
  callback: (options: EachLeafCallbackOptions) => void,
  result: EachContractLeafResultItem[] = [],
  isCurrentRouterContract = false,
): EachContractLeafResultItem[] {
  const hiddenContract = getRouterContract(options.router)

  if (!isCurrentRouterContract && hiddenContract) {
    return eachContractProcedureLeaf(
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
      lazy: flatLazy(options.router),
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
      eachContractProcedureLeaf(
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
