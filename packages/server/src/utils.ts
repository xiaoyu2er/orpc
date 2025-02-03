import type { AnyContractProcedure, AnyContractRouter } from '@orpc/contract'
import type { AnyProcedure, AnyRouter, Lazy } from '@orpc/server'
import { isContractProcedure } from '@orpc/contract'
import { getRouterContract, isLazy, unlazy } from '@orpc/server'

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
