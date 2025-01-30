import type { AnyContractProcedure, AnyContractRouter, HTTPPath } from '@orpc/contract'
import type { AnyProcedure, AnyRouter, Lazy } from '@orpc/server'
import { isContractProcedure } from '@orpc/contract'
import { getRouterContract, isLazy, unlazy } from '@orpc/server'

export interface EachLeafOptions {
  router: AnyContractRouter | AnyRouter
  path: string[]
}

export interface EachLeafCallbackOptions {
  contract: AnyContractProcedure
  path: string[]
}

export interface EachContractLeafResultItem {
  router: Lazy<AnyProcedure> | Lazy<Record<string, AnyRouter> | AnyProcedure>
  path: string[]
}

export function forEachContractProcedure(
  options: EachLeafOptions,
  callback: (options: EachLeafCallbackOptions) => void,
  result: EachContractLeafResultItem[] = [],
  isCurrentRouterContract = false,
): EachContractLeafResultItem[] {
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
      router: options.router,
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

export async function forEachAllContractProcedure(
  router: AnyContractRouter | AnyRouter,
  callback: (options: EachLeafCallbackOptions) => void,
) {
  const pending: EachLeafOptions[] = [{
    path: [],
    router,
  }]

  for (const item of pending) {
    const lazies = forEachContractProcedure(item, callback)

    for (const lazy of lazies) {
      const { default: router } = await unlazy(lazy.router)

      pending.push({
        path: lazy.path,
        router,
      })
    }
  }
}

export function standardizeHTTPPath(path: HTTPPath): HTTPPath {
  return `/${path.replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '')}`
}
