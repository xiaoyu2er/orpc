import { ContractProcedure, ContractRouter, ExtendedContractRouter } from '@orpc/contract'
import { Procedure } from './procedure'
import { Context } from './types'

export type Router<
  TContext extends Context = any,
  TContract extends ContractRouter = any
> = TContract extends ExtendedContractRouter<infer UContract>
  ? {
      [K in keyof UContract]: UContract[K] extends ContractProcedure
        ? Procedure<TContext, UContract[K]>
        : Router<TContext, UContract[K]>
    }
  : {
      [K in keyof TContract]: TContract[K] extends ContractProcedure
        ? Procedure<TContext, TContract[K]>
        : Router<TContext, TContract[K]>
    }
