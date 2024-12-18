import type { ContractProcedure, ContractRouter, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Lazy, Lazyable } from './lazy'
import type { Procedure } from './procedure'
import type { Context } from './types'

export type Router<
  TContext extends Context,
  TContract extends ContractRouter,
> = TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema>
  ? Lazyable<Procedure<TContext, any, UInputSchema, UOutputSchema, any>>
  : Lazyable<{
    [K in keyof TContract]: TContract[K] extends ContractRouter ? Router<TContext, TContract[K]> : never
  }>

export type ANY_ROUTER = Router<any, any>

export type InferRouterInputs<T extends ANY_ROUTER> =
  T extends Lazy<infer U extends ANY_ROUTER> ? InferRouterInputs<U>
    : T extends Procedure<any, any, infer UInputSchema, any, any>
      ? SchemaInput<UInputSchema>
      : {
          [K in keyof T]: T[K] extends ANY_ROUTER ? InferRouterInputs<T[K]> : never
        }

export type InferRouterOutputs<T extends ANY_ROUTER> =
  T extends Lazy<infer U extends ANY_ROUTER> ? InferRouterOutputs<U>
    : T extends Procedure<any, any, any, infer UOutputSchema, infer UFuncOutput>
      ? SchemaOutput<UOutputSchema, UFuncOutput>
      : {
          [K in keyof T]: T[K] extends ANY_ROUTER ? InferRouterOutputs<T[K]> : never
        }
