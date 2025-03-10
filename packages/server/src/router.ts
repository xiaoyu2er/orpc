import type { AnyContractRouter, ContractProcedure, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Context } from './context'
import type { Lazyable } from './lazy'
import type { Procedure } from './procedure'

export type Router<T extends AnyContractRouter, TInitialContext extends Context> =
  T extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer UMeta>
    ? Procedure<TInitialContext, any, UInputSchema, UOutputSchema, any, UErrorMap, UMeta>
    : {
        [K in keyof T]: T[K] extends AnyContractRouter ? Lazyable<Router<T[K], TInitialContext>> : never
      }

export type AnyRouter = Router<any, any>

export type InferRouterInitialContext<T extends AnyRouter> = T extends Router<any, infer UInitialContext>
  ? UInitialContext
  : never

export type InferRouterInitialContexts<T extends AnyRouter> =
  T extends Procedure<infer UInitialContext, any, any, any, any, any, any>
    ? UInitialContext
    : {
        [K in keyof T]: T[K] extends Lazyable<infer U extends AnyRouter> ? InferRouterInitialContexts<U> : never
      }

export type InferRouterCurrentContexts<T extends AnyRouter> =
  T extends Procedure<any, infer UCurrentContext, any, any, any, any, any>
    ? UCurrentContext
    : {
        [K in keyof T]: T[K] extends Lazyable<infer U extends AnyRouter> ? InferRouterCurrentContexts<U> : never
      }

export type InferRouterInputs<T extends AnyRouter> =
  T extends Procedure<any, any, infer UInputSchema, any, any, any, any>
    ? SchemaInput<UInputSchema>
    : {
        [K in keyof T]: T[K] extends Lazyable<infer U extends AnyRouter> ? InferRouterInputs<U> : never
      }

export type InferRouterOutputs<T extends AnyRouter> =
  T extends Procedure<any, any, any, infer UOutputSchema, infer UFuncOutput, any, any>
    ? SchemaOutput<UOutputSchema, UFuncOutput>
    : {
        [K in keyof T]: T[K] extends Lazyable<infer U extends AnyRouter> ? InferRouterOutputs<U> : never
      }
