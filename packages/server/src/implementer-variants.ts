import type { AnyContractRouter, ContractProcedure, InterContractRouterErrorMap, InterContractRouterMeta, Lazy } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ProcedureImplementer } from './implementer-procedure'
import type { Middleware } from './middleware'
import type { Router } from './router'
import type { EnhancedRouter } from './router-utils'

export interface RouterImplementerWithMiddlewares<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> {
  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      unknown,
      unknown,
      ORPCErrorConstructorMap<InterContractRouterErrorMap<TContract>>,
      InterContractRouterMeta<TContract>
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & ImplementerInternalWithMiddlewares<TContract, TInitialContext, MergedContext<TCurrentContext, U>>

  router<U extends Router<TContract, TCurrentContext>>(
    router: U
  ): EnhancedRouter<U, TInitialContext, Record<never, never>>

  lazy<U extends Router<TContract, TInitialContext>>(
    loader: () => Promise<{ default: U }>
  ): EnhancedRouter<Lazy<U>, TInitialContext, Record<never, never>>
}

export type ImplementerInternalWithMiddlewares<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> =
  &(
    TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer UMeta>
      ? ProcedureImplementer<TInitialContext, TCurrentContext, UInputSchema, UOutputSchema, UErrorMap, UMeta>
      : RouterImplementerWithMiddlewares<TContract, TInitialContext, TCurrentContext> & {
        [K in keyof TContract]: TContract[K] extends AnyContractRouter
          ? ImplementerInternalWithMiddlewares<TContract[K], TInitialContext, TCurrentContext>
          : never
      }
   )
