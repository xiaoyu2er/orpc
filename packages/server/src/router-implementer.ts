import { ContractRouter } from '@orpc/contract'
import { Router } from './router'
import { Context } from './types'

export class RouterImplementer<TContext extends Context, TContract extends ContractRouter<any>> {
  router(router: Router<TContext, TContract>): Router<TContext, TContract> {
    return router
  }
}
