import type { AnyContractRouter, ContractRouterClient } from '@orpc/contract'
import type { AnyRouter, RouterClient } from '@orpc/server'
import type { Client, ClientContext, ClientLink } from './types'

export interface createORPCClientOptions {
  /**
   * Use as base path for all procedure, useful when you only want to call a subset of the procedure.
   */
  path?: string[]
}

export function createORPCClient<TRouter extends AnyRouter | AnyContractRouter, TClientContext extends ClientContext = Record<never, never>>(
  link: ClientLink<TClientContext>,
  options?: createORPCClientOptions,
): TRouter extends AnyRouter // TODO: move this bellow `TRouter extends AnyContractRouter` can help me remove @orpc/server in dependencies
    ? RouterClient<TRouter, TClientContext>
    : TRouter extends AnyContractRouter
      ? ContractRouterClient<TRouter, TClientContext>
      : never {
  const path = options?.path ?? []

  const procedureClient: Client<TClientContext, unknown, unknown, Error> = async (...[input, options]) => {
    const optionsOut = {
      ...options,
      context: options?.context ?? {} as TClientContext, // options.context can be undefined when all field is optional
    }

    return await link.call(path, input, optionsOut)
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
