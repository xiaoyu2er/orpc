import type { ContractRouter } from '@orpc/contract'
import type { Router, RouterWithContract } from './router'
import { trim } from '@orpc/shared'
import { isProcedure, type Procedure } from './procedure'

export interface RoutingOptions<TContractRouter extends ContractRouter | undefined, TRouter extends Router<any>> {
  /**
   * The `contract router` used for routing the request.
   * If not provided, the `router` will be used.
   *
   * @default undefined
   */
  contract?: TContractRouter

  /**
   * The `router` used for handling the request,
   * and routing if `contract` is not provided.
   *
   */
  router: TRouter & (TContractRouter extends ContractRouter ? RouterWithContract<any, TContractRouter> : unknown)

  /**
   * The pathname used for finding the procedure.
   */
  pathname: string
}

export interface Routing {
  <TContractRouter extends ContractRouter | undefined, TRouter extends Router<any>>(
    options: RoutingOptions<TContractRouter, TRouter>
  ): {
    procedure: Procedure<any, any, any, any, any>
    path: string[]
    params?: Record<string, string>
  } | undefined
}

export const orpcRouting: Routing = (options) => {
  const path = trim(options.pathname, '/').split('/').map(decodeURIComponent)

  let current: Router<any> | Procedure<any, any, any, any, any> | undefined = options.router
  for (const segment of path) {
    if ((typeof current !== 'object' || current === null) && typeof current !== 'function') {
      current = undefined
      break
    }

    current = (current as any)[segment]
  }

  return isProcedure(current)
    ? {
        procedure: current,
        path,
      }
    : undefined
}
