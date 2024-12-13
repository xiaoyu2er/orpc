import type { ANY_CONTRACT_PROCEDURE, ContractProcedure } from './procedure'
import type { SchemaInput, SchemaOutput } from './types'

export interface ContractRouter {
  [k: string]: ANY_CONTRACT_PROCEDURE | ContractRouter
}

export type InferContractRouterInputs<T extends ContractRouter> = {
  [K in keyof T]: T[K] extends ContractProcedure<infer UInputSchema, any>
    ? SchemaInput<UInputSchema>
    : T[K] extends ContractRouter
      ? InferContractRouterInputs<T[K]>
      : never
}

export type InferContractRouterOutputs<T extends ContractRouter> = {
  [K in keyof T]: T[K] extends ContractProcedure<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : T[K] extends ContractRouter
      ? InferContractRouterOutputs<T[K]>
      : never
}
