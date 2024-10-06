import { isContractProcedure } from './procedure'
import type { ContractRouter } from './router'
import type { HTTPPath } from './types'

export class ContractRouterBuilder {
  constructor(public zzContractRouterBuilder: { prefix?: HTTPPath }) {}

  prefix(prefix: HTTPPath): ContractRouterBuilder {
    return new ContractRouterBuilder({
      ...this.zzContractRouterBuilder,
      prefix: `${this.zzContractRouterBuilder.prefix ?? ''}${prefix}`,
    })
  }

  router<T extends ContractRouter>(router: T): T {
    if (!this.zzContractRouterBuilder.prefix) {
      return router
    }

    const clone: ContractRouter = {}

    for (const key in router) {
      const item = router[key]
      if (isContractProcedure(item)) {
        clone[key] = item.prefix(this.zzContractRouterBuilder.prefix)
      } else {
        clone[key] = this.router(item as any)
      }
    }

    return clone as T
  }
}
