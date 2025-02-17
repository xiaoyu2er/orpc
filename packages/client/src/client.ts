import type { Client, ClientLink, InferClientContext, NestedClient } from './types'

export interface createORPCClientOptions {
  /**
   * Use as base path for all procedure, useful when you only want to call a subset of the procedure.
   */
  path?: string[]
}

export function createORPCClient<T extends NestedClient<any>>(
  link: ClientLink<InferClientContext<T>>,
  options?: createORPCClientOptions,
): T {
  const path = options?.path ?? []

  const procedureClient: Client<InferClientContext<T>, unknown, unknown, Error> = async (...[input, options]) => {
    const optionsOut = {
      ...options,
      context: options?.context ?? {} as InferClientContext<T>, // options.context can be undefined when all field is optional
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
