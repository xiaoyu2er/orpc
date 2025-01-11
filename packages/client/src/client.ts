import type { Client, ContractRouter, ContractRouterClient } from '@orpc/contract'
import type { ANY_ROUTER, RouterClient } from '@orpc/server'
import type { ClientLink } from './types'

export interface createORPCClientOptions {
  /**
   * Use as base path for all procedure, useful when you only want to call a subset of the procedure.
   */
  path?: string[]
}

export function createORPCClient<TRouter extends ANY_ROUTER | ContractRouter, TClientContext = unknown>(
  link: ClientLink<TClientContext>,
  options?: createORPCClientOptions,
): TRouter extends ContractRouter
    ? ContractRouterClient<TRouter, TClientContext>
    : TRouter extends ANY_ROUTER // put this in lower priority than ContractRouter, will make createORPCClient can work without @orpc/server
      ? RouterClient<TRouter, TClientContext>
      : never {
  const path = options?.path ?? []

  const procedureClient: Client<TClientContext, unknown, unknown, Error> = async (...[input, options]) => {
    return await link.call(path, input, (options ?? {}) as Exclude<typeof options, undefined>)
  }

  const recursive = new Proxy(procedureClient, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      return createORPCClient(link, {
        ...options,
        path: [...path, key],
      })
    },
  })

  return recursive as any
}
