/// <reference lib="dom" />

import type {
  ContractProcedure,
  ContractRouter,
  SchemaOutput,
} from '@orpc/contract'
import type { Lazy, Procedure, Router } from '@orpc/server'
import type { Promisable } from '@orpc/shared'
import { createProcedureClient, type ProcedureClient } from './procedure'

export type RouterClientWithContractRouter<TRouter extends ContractRouter> = {
  [K in keyof TRouter]: TRouter[K] extends ContractProcedure<
    infer UInputSchema,
    infer UOutputSchema
  >
    ? ProcedureClient<UInputSchema, UOutputSchema, SchemaOutput<UOutputSchema>>
    : TRouter[K] extends ContractRouter
      ? RouterClientWithContractRouter<TRouter[K]>
      : never
}

export type RouterClientWithRouter<TRouter extends Router<any>> = {
  [K in keyof TRouter]: TRouter[K] extends
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
    ? ProcedureClient<UInputSchema, UOutputSchema, UFuncOutput>
    : TRouter[K] extends Router<any>
      ? RouterClientWithRouter<TRouter[K]>
      : never
}

export interface CreateRouterClientOptions {
  /**
   * The base url of the server.
   */
  baseURL: string

  /**
   * The fetch function used to make the request.
   * @default global fetch
   */
  fetch?: typeof fetch

  /**
   * The headers used to make the request.
   * Invoked before the request is made.
   */
  headers?: (input: unknown) => Promisable<Headers | Record<string, string>>

  /**
   * This used for internal purpose only.
   *
   * @internal
   */
  path?: string[]
}

export function createRouterClient<
  TRouter extends Router<any> | ContractRouter,
>(
  options: CreateRouterClientOptions,
): TRouter extends Router<any>
    ? RouterClientWithRouter<TRouter>
    : TRouter extends ContractRouter
      ? RouterClientWithContractRouter<TRouter>
      : never {
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
