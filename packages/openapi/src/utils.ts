import type { ContractRouter, WELL_CONTRACT_PROCEDURE } from '@orpc/contract'
import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE, Lazy, Router } from '@orpc/server'
import { isContractProcedure } from '@orpc/contract'
import { isLazy, isProcedure, ROUTER_CONTRACT_SYMBOL } from '@orpc/server'

export interface EachLeafOptions {
  router: ANY_PROCEDURE | Router<any> | ContractRouter | ANY_CONTRACT_PROCEDURE
  path: string[]
}

export interface EachLeafCallbackOptions {
  contract: WELL_CONTRACT_PROCEDURE
  path: string[]
}

export interface EachContractLeafResultItem {
  lazy: ANY_LAZY_PROCEDURE | Lazy<Router<any>>
  path: string[]
}

export function eachContractProcedureLeaf(
  options: EachLeafOptions,
  callback: (options: EachLeafCallbackOptions) => void,
  result: EachContractLeafResultItem[] = [],
  isCurrentRouterContract = false,
): EachContractLeafResultItem[] {
  if (!isCurrentRouterContract && ROUTER_CONTRACT_SYMBOL in options.router && options.router[ROUTER_CONTRACT_SYMBOL]) {
    return eachContractProcedureLeaf(
      {
        path: options.path,
        router: options.router[ROUTER_CONTRACT_SYMBOL] as any,
      },
      callback,
      result,
      true,
    )
  }

  if (isLazy(options.router)) {
    result.push({
      lazy: options.router,
      path: options.path,
    })
  }

  //
  else if (isProcedure(options.router)) {
    callback({
      contract: options.router.zz$p.contract,
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
