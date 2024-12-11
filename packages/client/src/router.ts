import type {
  ContractProcedure,
  ContractRouter,
  SchemaInput,
  SchemaOutput,
} from '@orpc/contract'
import type { Caller, Lazy, Procedure, Router } from '@orpc/server'
import type { SetOptional } from '@orpc/shared'
import type { CreateProcedureClientOptions } from './procedure'
import { createProcedureClient } from './procedure'

export type RouterClient<T extends Router<any> | ContractRouter> = {
  [K in keyof T]: T[K] extends
  | ContractProcedure<infer UInputSchema, infer UOutputSchema>
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
    ?
    & Caller<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>>
    : T[K] extends Router<any> | ContractRouter
      ? RouterClient<T[K]>
      : never
}

export function createRouterClient<T extends Router<any> | ContractRouter>(
  options: SetOptional<CreateProcedureClientOptions, 'path'>,
): RouterClient<T> {
  const path = options?.path ?? []

  const client = new Proxy(
    createProcedureClient({
      baseURL: options.baseURL,
      fetch: options.fetch,
      headers: options.headers,
      path,
    }),
    {
      get(target, key) {
        if (typeof key !== 'string') {
          return Reflect.get(target, key)
        }

        return createRouterClient({
          ...options,
          path: [...path, key],
        })
      },
    },
  )

  return client as any
}
