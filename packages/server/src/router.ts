import { ContractRoute, ContractRouter, ExtendedContractRouter } from '@orpc/contract'
import { ServerRoute } from './route'
import { ServerContext } from './types'

export type ServerRouter<
  TContext extends ServerContext = any,
  TContract extends ContractRouter = any
> = TContract extends ExtendedContractRouter<infer UContract>
  ? {
      [K in keyof UContract]: UContract[K] extends ContractRoute
        ? ServerRoute<TContext, UContract[K]>
        : ServerRouter<TContext, UContract[K]>
    }
  : {
      [K in keyof TContract]: TContract[K] extends ContractRoute
        ? ServerRoute<TContext, TContract[K]>
        : ServerRouter<TContext, TContract[K]>
    }
