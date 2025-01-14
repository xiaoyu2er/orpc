import type { ContractProcedure } from './procedure'
import type { ContractProcedureClient } from './procedure-client'
import type { ContractRouter } from './router'

export type ContractRouterClient<TRouter extends ContractRouter<any>, TClientContext> =
  TRouter extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap>
    ? ContractProcedureClient<TClientContext, UInputSchema, UOutputSchema, UErrorMap>
    : {
        [K in keyof TRouter]: TRouter[K] extends ContractRouter<any> ? ContractRouterClient<TRouter[K], TClientContext> : never
      }
