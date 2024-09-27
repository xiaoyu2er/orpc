import { ContractRouter } from '@orpc/contract'
import { ServerRouter } from './router'
import { ServerContext } from './types'

export class ServerRouterBuilder<
  TContext extends ServerContext = any,
  TContract extends ContractRouter = any
> {
  router(router: ServerRouter<TContext, TContract>): typeof router {
    return router
  }
}
