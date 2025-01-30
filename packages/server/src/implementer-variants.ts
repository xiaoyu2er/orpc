import type { AnyContractRouter, ContractProcedure, ContractRouter, ContractRouterToErrorMap, ORPCErrorConstructorMap } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { ProcedureImplementer } from './implementer-procedure'
import type { FlattenLazy } from './lazy-utils'
import type { Middleware } from './middleware'
import type { AdaptedRouter, Router } from './router'

export type ImplementerInternalWithMiddlewares<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> =
  &(
    TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer UMeta>
      ? ProcedureImplementer<TInitialContext, TCurrentContext, UInputSchema, UOutputSchema, UErrorMap, UMeta>
      : TContract extends ContractRouter<infer UMeta> ? {
        use<U extends Context>(
          middleware: Middleware<
            TInitialContext,
            U,
            unknown,
            unknown,
            ORPCErrorConstructorMap<ContractRouterToErrorMap<TContract>>,
            UMeta
          >,
        ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
          & ImplementerInternalWithMiddlewares<TContract, TInitialContext, MergedContext<TCurrentContext, U>>

        router<U extends Router<TCurrentContext, TContract>>(router: U): AdaptedRouter<U, TInitialContext, Record<never, never>>

        lazy<U extends Router<TInitialContext, TContract>>(
          loader: () => Promise<{ default: U }>
        ): AdaptedRouter<FlattenLazy<U>, TInitialContext, Record<never, never>>
      } & {
        [K in keyof TContract]: TContract[K] extends AnyContractRouter
          ? ImplementerInternalWithMiddlewares<TContract[K], TInitialContext, TCurrentContext>
          : never
      } : never
   )
