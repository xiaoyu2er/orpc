import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
import type { InferSchemaInput, InferSchemaOutput } from './schema'

export type ContractRouter<TMeta extends Meta> =
  | ContractProcedure<any, any, any, TMeta>
  | {
    [k: string]: ContractRouter<TMeta>
  }

export type AnyContractRouter = ContractRouter<any>

export type InferContractRouterInputs<T extends AnyContractRouter> =
  T extends ContractProcedure<infer UInputSchema, any, any, any>
    ? InferSchemaInput<UInputSchema>
    : {
        [K in keyof T]: T[K] extends AnyContractRouter ? InferContractRouterInputs<T[K]> : never
      }

export type InferContractRouterOutputs<T extends AnyContractRouter> =
  T extends ContractProcedure<any, infer UOutputSchema, any, any>
    ? InferSchemaOutput<UOutputSchema>
    : {
        [K in keyof T]: T[K] extends AnyContractRouter ? InferContractRouterOutputs<T[K]> : never
      }

export type InferContractRouterErrorMap<T extends AnyContractRouter> =
  T extends ContractProcedure<any, any, infer UErrorMap, any>
    ? UErrorMap
    : {
        [K in keyof T]: T[K] extends AnyContractRouter ? InferContractRouterErrorMap<T[K]> : never
      }[keyof T]

export type InferContractRouterMeta<T extends AnyContractRouter> = T extends ContractRouter<infer UMeta> ? UMeta : never
