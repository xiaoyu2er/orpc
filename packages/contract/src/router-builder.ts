import { DecoratedContractProcedure, isContractProcedure } from './procedure'
import type { ContractRouter } from './router'
import type { HTTPPath } from './types'

export class ContractRouterBuilder {
  constructor(public zz$crb: { prefix?: HTTPPath }) {}

  prefix(prefix: HTTPPath): ContractRouterBuilder {
    return new ContractRouterBuilder({
      ...this.zz$crb,
      prefix: `${this.zz$crb.prefix ?? ''}${prefix}`,
    })
  }

  router<T extends ContractRouter>(router: T): T {
    if (!this.zz$crb.prefix) {
      return router
    }

    const clone: ContractRouter = {}

    for (const key in router) {
      const item = router[key]
      if (isContractProcedure(item)) {
        clone[key] = new DecoratedContractProcedure(item.zz$cp).prefix(
          this.zz$crb.prefix,
        )
      } else {
        clone[key] = this.router(item as any)
      }
    }

    return clone as T
  }
}
