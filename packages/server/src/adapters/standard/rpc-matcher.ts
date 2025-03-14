import type { AnyContractProcedure, HTTPPath } from '@orpc/contract'
import type { AnyProcedure } from '../../procedure'
import type { AnyRouter } from '../../router'
import type { LazyTraverseContractProceduresOptions } from '../../router-utils'
import type { StandardMatcher, StandardMatchResult } from './types'
import { unlazy } from '../../lazy'
import { isProcedure } from '../../procedure'
import { createContractedProcedure } from '../../procedure-utils'
import { getRouter, traverseContractProcedures } from '../../router-utils'
import { toHttpPath } from '../../utils'

export class StandardRPCMatcher implements StandardMatcher {
  private readonly tree: Record<
    HTTPPath,
    {
      path: readonly string[]
      contract: AnyContractProcedure
      procedure: AnyProcedure | undefined
      router: AnyRouter
    }
  > = {}

  private pendingRouters: (LazyTraverseContractProceduresOptions & { httpPathPrefix: HTTPPath }) [] = []

  init(router: AnyRouter, path: readonly string[] = []): void {
    const laziedOptions = traverseContractProcedures({ router, path }, ({ path, contract }) => {
      const httpPath = toHttpPath(path)

      if (isProcedure(contract)) {
        this.tree[httpPath] = {
          path,
          contract,
          procedure: contract, // this mean dev not used contract-first so we can used contract as procedure directly
          router,
        }
      }
      else {
        this.tree[httpPath] = {
          path,
          contract,
          procedure: undefined,
          router,
        }
      }
    })

    this.pendingRouters.push(...laziedOptions.map(option => ({
      ...option,
      httpPathPrefix: toHttpPath(option.path),
    })))
  }

  async match(_method: string, pathname: HTTPPath): Promise<StandardMatchResult> {
    if (this.pendingRouters.length) {
      const newPendingRouters: typeof this.pendingRouters = []

      for (const pendingRouter of this.pendingRouters) {
        if (pathname.startsWith(pendingRouter.httpPathPrefix)) {
          const { default: router } = await unlazy(pendingRouter.router)
          this.init(router, pendingRouter.path)
        }
        else {
          newPendingRouters.push(pendingRouter)
        }
      }

      this.pendingRouters = newPendingRouters
    }

    const match = this.tree[pathname]

    if (!match) {
      return undefined
    }

    if (!match.procedure) {
      const { default: maybeProcedure } = await unlazy(getRouter(match.router, match.path))

      if (!isProcedure(maybeProcedure)) {
        throw new Error(`
          [Contract-First] Missing or invalid implementation for procedure at path: ${toHttpPath(match.path)}.
          Ensure that the procedure is correctly defined and matches the expected contract.
        `)
      }

      match.procedure = createContractedProcedure(maybeProcedure, match.contract)
    }

    return {
      path: match.path,
      procedure: match.procedure,
    }
  }
}
