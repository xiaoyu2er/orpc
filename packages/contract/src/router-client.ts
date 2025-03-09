import type { ClientContext } from '@orpc/client'
import type { Lazy, Lazyable } from './lazy'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureClient } from './procedure-client'
import type { AnyContractRouter } from './router'

export type ContractRouterClient<T extends Lazyable<AnyContractRouter>, TClientContext extends ClientContext> =
  T extends Lazy<infer U extends AnyContractRouter>
    ? ContractRouterClient<U, TClientContext>
    : T extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, any>
      ? ContractProcedureClient<TClientContext, UInputSchema, UOutputSchema, UErrorMap>
      : {
          [K in keyof T]: T[K] extends Lazyable<AnyContractRouter> ? ContractRouterClient<T[K], TClientContext> : never
        }
