import type { AnyContractRouter, ContractProcedure } from '@orpc/contract'
import type { Context } from './context'
import type { Lazyable } from './lazy'
import type { Procedure } from './procedure'

export type Router<
  TInitialContext extends Context,
  TContract extends AnyContractRouter,
> = Lazyable<
  TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer URoute, infer UMetaDef, infer UMeta>
    ? Procedure<TInitialContext, any, UInputSchema, UOutputSchema, any, UErrorMap, URoute, UMetaDef, UMeta>
    : {
        [K in keyof TContract]: TContract[K] extends AnyContractRouter ? Router<TInitialContext, TContract[K]> : never
      }
>

export type AnyRouter = Router<any, any>
