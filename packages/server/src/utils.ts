import type { AnyContractProcedure, AnyContractRouter, HTTPPath } from '@orpc/contract'
import type { AnyProcedure, AnyRouter, Lazy } from '@orpc/server'
import { isContractProcedure } from '@orpc/contract'
import { getRouterContract, isLazy, Procedure, unlazy } from '@orpc/server'

export interface EachContractProcedureOptions {
  router: AnyRouter | AnyContractRouter
  path: string[]
}

export interface EachContractProcedureCallbackOptions {
  contract: AnyContractProcedure
  path: string[]
}

export interface EachContractProcedureLaziedOptions {
  lazied: Lazy<AnyProcedure> | Lazy<Record<string, AnyRouter> | AnyProcedure>
  path: string[]
}

export function eachContractProcedure(
  options: EachContractProcedureOptions,
  callback: (options: EachContractProcedureCallbackOptions) => void,
  laziedOptions: EachContractProcedureLaziedOptions[] = [],
): EachContractProcedureLaziedOptions[] {
  const hiddenContract = getRouterContract(options.router)

  if (hiddenContract) {
    return eachContractProcedure(
      {
        router: hiddenContract,
        path: options.path,
      },
      callback,
      laziedOptions,
    )
  }

  if (isLazy(options.router)) {
    laziedOptions.push({
      lazied: options.router,
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
      eachContractProcedure(
        {
          router: (options.router as any)[key],
          path: [...options.path, key],
        },
        callback,
        laziedOptions,
      )
    }
  }

  return laziedOptions
}

export async function eachAllContractProcedure(
  options: EachContractProcedureOptions,
  callback: (options: EachContractProcedureCallbackOptions) => void,
) {
  const pending: EachContractProcedureOptions[] = [options]

  for (const item of pending) {
    const lazies = eachContractProcedure(item, callback)

    for (const lazy of lazies) {
      const { default: router } = await unlazy(lazy.lazied)

      pending.push({
        path: lazy.path,
        router,
      })
    }
  }
}

export function convertPathToHttpPath(path: string[]): HTTPPath {
  return `/${path.map(encodeURIComponent).join('/')}`
}

/**
 * Create a new procedure that ensure the contract is applied to the procedure.
 */
export function createContractedProcedure(contract: AnyContractProcedure, procedure: AnyProcedure): AnyProcedure {
  return new Procedure({
    ...procedure['~orpc'],
    errorMap: contract['~orpc'].errorMap,
    route: contract['~orpc'].route,
    meta: contract['~orpc'].meta,
  })
}
