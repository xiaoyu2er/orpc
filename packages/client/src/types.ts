import type { ContractProcedure, ContractRouter, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ANY_ROUTER, Lazyable, Procedure, ProcedureClient } from '@orpc/server'

export type RemoteRouterClient<T extends ANY_ROUTER | ContractRouter> = T extends
  | ContractProcedure<infer UInputSchema, infer UOutputSchema>
  | Lazyable<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
  ? ProcedureClient<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>>
  : {
      [K in keyof T]: T[K] extends ANY_ROUTER | ContractRouter
        ? RemoteRouterClient<T[K]>
        : never
    }
