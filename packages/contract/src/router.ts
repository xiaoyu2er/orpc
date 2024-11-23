import type { SchemaInput, SchemaOutput } from './types'
import {
  type ContractProcedure,
  type DecoratedContractProcedure,
  isContractProcedure,
  type WELL_DEFINED_CONTRACT_PROCEDURE,
} from './procedure'

export interface ContractRouter {
  [k: string]: ContractProcedure<any, any> | ContractRouter
}

export type HandledContractRouter<TContract extends ContractRouter> = {
  [K in keyof TContract]: TContract[K] extends ContractProcedure<
    infer UInputSchema,
    infer UOutputSchema
  >
    ? DecoratedContractProcedure<UInputSchema, UOutputSchema>
    : TContract[K] extends ContractRouter
      ? HandledContractRouter<TContract[K]>
      : never
}

export function eachContractRouterLeaf(
  router: ContractRouter,
  callback: (item: WELL_DEFINED_CONTRACT_PROCEDURE, path: string[]) => void,
  prefix: string[] = [],
) {
  for (const key in router) {
    const item = router[key]

    if (isContractProcedure(item)) {
      callback(item, [...prefix, key])
    }
    else {
      eachContractRouterLeaf(item as ContractRouter, callback, [...prefix, key])
    }
  }
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
