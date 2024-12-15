import type { ContractProcedure, ContractRouter, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { Context } from './types'

export type Router<
  TContext extends Context,
  TContract extends ContractRouter,
> = {
  [K in keyof TContract]: TContract[K] extends ContractProcedure<infer UInputSchema, infer UOutputSchema>
    ?
    | Procedure<TContext, any, UInputSchema, UOutputSchema, any>
    | Lazy<Procedure<TContext, any, UInputSchema, UOutputSchema, any>>
    : TContract[K] extends ContractRouter
      ? Router<TContext, TContract[K]> | Lazy<Router<TContext, TContract[K]>>
      : never
}

export type ANY_ROUTER = Router<any, any>

export type InferRouterInputs<T extends ANY_ROUTER> = {
  [K in keyof T]: T[K] extends
  | Procedure<any, any, infer UInputSchema, any, any>
  | Lazy<Procedure<any, any, infer UInputSchema, any, any>>
    ? SchemaInput<UInputSchema>
    : T[K] extends ANY_ROUTER
      ? InferRouterInputs<T[K]>
      : T[K] extends Lazy<infer U>
        ? U extends ANY_ROUTER
          ? InferRouterInputs<U>
          : never
        : never
}

export type InferRouterOutputs<T extends ANY_ROUTER> = {
  [K in keyof T]: T[K] extends
  | Procedure<any, any, any, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, any, infer UOutputSchema, infer UFuncOutput>>
    ? SchemaOutput<UOutputSchema, UFuncOutput>
    : T[K] extends ANY_ROUTER
      ? InferRouterOutputs<T[K]>
      : T[K] extends Lazy<infer U>
        ? U extends ANY_ROUTER
          ? InferRouterOutputs<U>
          : never
        : never
}
