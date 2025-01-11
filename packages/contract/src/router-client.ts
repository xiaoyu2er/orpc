import type { ContractProcedure } from './procedure'
import type { ContractProcedureClient } from './procedure-client'
import type { ContractRouter } from './router'

export type ContractRouterClient<TRouter extends ContractRouter, TClientContext> =
  TRouter extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap>
    ? ContractProcedureClient<TClientContext, UInputSchema, UOutputSchema, UErrorMap>
    : {
        [K in keyof TRouter]: TRouter[K] extends ContractRouter ? ContractRouterClient<TRouter[K], TClientContext> : never
      }
