import { DecoratedContractProcedure, isContractProcedure } from './procedure'
import type { ContractRouter, HandledContractRouter } from './router'
import type { HTTPPath } from './types'

export class ContractRouterBuilder {
  constructor(public zz$crb: { prefix?: HTTPPath; tags?: string[] }) {}

  prefix(prefix: HTTPPath): ContractRouterBuilder {
    return new ContractRouterBuilder({
      ...this.zz$crb,
      prefix: `${this.zz$crb.prefix ?? ''}${prefix}`,
    })
  }

  tags(...tags: string[]): ContractRouterBuilder {
    if (!tags.length) return this

    return new ContractRouterBuilder({
      ...this.zz$crb,
      tags: [...(this.zz$crb.tags ?? []), ...tags],
    })
  }

  router<T extends ContractRouter>(router: T): HandledContractRouter<T> {
    const handled: ContractRouter = {}

    for (const key in router) {
      const item = router[key]
      if (isContractProcedure(item)) {
        const decorated = DecoratedContractProcedure.decorate(item).addTags(
          ...(this.zz$crb.tags ?? []),
        )

        handled[key] = this.zz$crb.prefix
          ? decorated.prefix(this.zz$crb.prefix)
          : decorated
      } else {
        handled[key] = this.router(item as ContractRouter)
      }
    }

    return handled as HandledContractRouter<T>
  }
}
