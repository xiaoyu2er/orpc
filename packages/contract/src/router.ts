import type { ErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { SchemaInput, SchemaOutput } from './types'

export type ContractRouter<T extends ErrorMap> = ContractProcedure<any, any, T, any> | {
  [k: string]: ContractRouter<T>
}

export type InferContractRouterInputs<T extends ContractRouter<any>> =
  T extends ContractProcedure<infer UInputSchema, any, any, any>
    ? SchemaInput<UInputSchema>
    : {
        [K in keyof T]: T[K] extends ContractRouter<any> ? InferContractRouterInputs<T[K]> : never
      }

export type InferContractRouterOutputs<T extends ContractRouter<any>> =
  T extends ContractProcedure<any, infer UOutputSchema, any, any>
    ? SchemaOutput<UOutputSchema>
    : {
        [K in keyof T]: T[K] extends ContractRouter<any> ? InferContractRouterOutputs<T[K]> : never
      }
