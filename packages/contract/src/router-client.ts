import type { ClientContext } from '@orpc/client'
import type { Lazyable } from './lazy'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureClient } from './procedure-client'
import type { AnyContractRouter } from './router'

export type ContractRouterClient<T extends AnyContractRouter, TClientContext extends ClientContext> =
   T extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, any>
     ? ContractProcedureClient<TClientContext, UInputSchema, UOutputSchema, UErrorMap>
     : {
         [K in keyof T]: T[K] extends Lazyable<infer U extends AnyContractRouter> ? ContractRouterClient<U, TClientContext> : never
       }
