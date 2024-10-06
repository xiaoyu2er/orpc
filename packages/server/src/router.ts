import {
  type ContractProcedure,
  type ContractRouter,
  type DecoratedContractProcedure,
  type HTTPPath,
  createCallableObject,
  isContractProcedure,
} from '@orpc/contract'
import { type Procedure, isProcedure } from './procedure'
import type { Context } from './types'

export interface Router<TContext extends Context> {
  [k: string]: Procedure<TContext, any, any, any> | Router<TContext>
}

export type RouterWithContract<
  TContext extends Context,
  TContract extends ContractRouter,
> = {
  [K in keyof TContract]: TContract[K] extends ContractProcedure<any, any>
    ? Procedure<TContext, TContract[K], any, any>
    : TContract[K] extends ContractRouter
      ? RouterWithContract<TContext, TContract[K]>
      : never
}

export function toContractRouter(
  router: ContractRouter | Router<any>,
): ContractRouter {
  const contract: ContractRouter = {}

  for (const key in router) {
    const item = router[key]

    if (isContractProcedure(item)) {
      contract[key] = item
    } else if (isProcedure(item)) {
      contract[key] = item.zzProcedure.contract
    } else {
      contract[key] = toContractRouter(item as any)
    }
  }

  return contract
}
