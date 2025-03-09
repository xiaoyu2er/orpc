import type { Lazyable } from './lazy'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
import type { SchemaInput, SchemaOutput } from './schema'

export type ContractRouter<TMeta extends Meta> =
  | ContractProcedure<any, any, any, TMeta>
  | {
    [k: string]: Lazyable<ContractRouter<TMeta>>
  }

export type AnyContractRouter = ContractRouter<any>

export type InferContractRouterInputs<T extends AnyContractRouter> =
  T extends ContractProcedure<infer UInputSchema, any, any, any>
    ? SchemaInput<UInputSchema>
    : {
        [K in keyof T]: T[K] extends Lazyable<infer U extends AnyContractRouter> ? InferContractRouterInputs<U> : never
      }

export type InferContractRouterOutputs<T extends Lazyable<AnyContractRouter>> =
   T extends ContractProcedure<any, infer UOutputSchema, any, any>
     ? SchemaOutput<UOutputSchema>
     : {
         [K in keyof T]: T[K] extends Lazyable<infer U extends AnyContractRouter> ? InferContractRouterOutputs<U> : never
       }

export type InterContractRouterErrorMap<T extends Lazyable<AnyContractRouter>> =
  T extends ContractProcedure<any, any, infer UErrorMap, any> ? UErrorMap :
      {
        [K in keyof T]: T[K] extends Lazyable<infer U extends AnyContractRouter> ? InterContractRouterErrorMap<U> : never
      }[keyof T]

export type InterContractRouterMeta<T extends AnyContractRouter> = T extends ContractRouter<infer UMeta> ? UMeta : never
