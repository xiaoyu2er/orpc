import type {
  ContractProcedure,
  ContractRouter,
  SchemaOutput,
} from '@orpc/contract'
import type { Procedure, Router } from '@orpc/server'
import {} from 'react'
import type { ORPCContext } from './context'
import {
  type ProcedureReactClient,
  createProcedureReactClient,
} from './procedure'

export type RouterReactClientWithContractRouter<
  TRouter extends ContractRouter,
> = {
  [K in keyof TRouter]: TRouter[K] extends ContractProcedure<
    infer UInputSchema,
    infer UOutputSchema
  >
    ? ProcedureReactClient<
        UInputSchema,
        UOutputSchema,
        SchemaOutput<UOutputSchema>
      >
    : TRouter[K] extends ContractRouter
      ? RouterReactClientWithContractRouter<TRouter[K]>
      : never
}

export type RouterReactClientWithRouter<TRouter extends Router<any>> = {
  [K in keyof TRouter]: TRouter[K] extends Procedure<
    any,
    any,
    infer UInputSchema,
    infer UOutputSchema,
    infer UHandlerOutput
  >
    ? ProcedureReactClient<UInputSchema, UOutputSchema, UHandlerOutput>
    : TRouter[K] extends Router<any>
      ? RouterReactClientWithRouter<TRouter[K]>
      : never
}

export interface CreateRouterReactClientOptions {
  /**
   * The ORPCContext
   */
  context?: ORPCContext

  /**
   * This used for internal purpose only.
   *
   * @internal
   */
  path?: string[]
}

export function createRouterReactClient<
  TRouter extends Router<any> | ContractRouter,
>(
  options?: CreateRouterReactClientOptions,
): TRouter extends Router<any>
  ? RouterReactClientWithRouter<TRouter>
  : TRouter extends ContractRouter
    ? RouterReactClientWithContractRouter<TRouter>
    : never {
  const path = options?.path ?? []

  const client = new Proxy(
    createProcedureReactClient({ path, context: options?.context }),
    {
      get(target, key) {
        const value = Reflect.get(target, key)
        if (typeof key !== 'string') {
          return value
        }

        const client = createRouterReactClient({
          ...options,
          path: [...path, key],
        })

        if (typeof value !== 'function') {
          if (value !== undefined) {
            throw new Error(`
                This error should never happen. the error happen on [${[...path, key].join('.')}]. 
                Expect createProcedureReactClient return an object with only function items.
                Please report this issue.
            `)
          }

          return client
        }

        return new Proxy(value, {
          get(_, key) {
            return Reflect.get(client, key)
          },
        })
      },
    },
  )

  return client as any
}
