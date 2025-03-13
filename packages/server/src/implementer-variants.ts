import type { AnyContractRouter, ContractProcedure, InferContractRouterErrorMap, InferContractRouterMeta } from '@orpc/contract'
import type { Context, ContextExtendsGuard, MergedCurrentContext, MergedInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ProcedureImplementer } from './implementer-procedure'
import type { Lazy } from './lazy'
import type { Middleware } from './middleware'
import type { Router } from './router'
import type { EnhancedRouter } from './router-utils'

export interface RouterImplementerWithMiddlewares<
  T extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> {
  use<UOutContext extends Context, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext,
      UOutContext,
      unknown,
      unknown,
      ORPCErrorConstructorMap<InferContractRouterErrorMap<T>>,
      InferContractRouterMeta<T>
    >,
  ): ContextExtendsGuard<UInContext, TCurrentContext>
    & ImplementerInternalWithMiddlewares<
      T,
      MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
      MergedCurrentContext<TCurrentContext, UOutContext>
    >

  router<U extends Router<T, TCurrentContext>>(
    router: U): EnhancedRouter<U, TInitialContext, TCurrentContext, Record<never, never>>

  lazy<U extends Router<T, TInitialContext>>(
    loader: () => Promise<{ default: U }>
  ): EnhancedRouter<Lazy<U>, TInitialContext, TCurrentContext, Record<never, never>>
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
