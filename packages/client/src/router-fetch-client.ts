import type { ContractRouter } from '@orpc/contract'
import type { ANY_ROUTER, RouterClient } from '@orpc/server'
import type { SetOptional } from '@orpc/shared'
import type { CreateProcedureClientOptions } from './procedure-fetch-client'
import { createProcedureFetchClient } from './procedure-fetch-client'

export function createRouterFetchClient<T extends ANY_ROUTER | ContractRouter>(
  options: SetOptional<CreateProcedureClientOptions, 'path'>,
): RouterClient<T> {
  const path = options?.path ?? []

  const client = new Proxy(
    createProcedureFetchClient({
      ...options,
      path,
    }),
    {
      get(target, key) {
        if (typeof key !== 'string') {
          return Reflect.get(target, key)
        }

        return createRouterFetchClient({
          ...options,
          path: [...path, key],
        })
      },
    },
  )

  return client as any
}
