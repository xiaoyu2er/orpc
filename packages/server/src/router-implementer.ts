import { ContractRouter } from '@orpc/contract'
import { Router } from './router'
import { Context } from './types'

export class RouterImplementer<
  TContext extends Context = any,
  TContract extends ContractRouter = any
> {
  router(router: Router<TContext, TContract>): typeof router {
    return router
  }
}
