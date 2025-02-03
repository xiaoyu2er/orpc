import type { AnyContractProcedure, HTTPPath } from '@orpc/contract'
import type { AnyProcedure } from '../../procedure'
import type { EachContractProcedureLaziedOptions } from '../../utils'
import type { StandardMatcher, StandardMatchResult } from './types'
import { type Lazy, unlazy } from '../../lazy'
import { isProcedure } from '../../procedure'
import { type AnyRouter, getRouterChild } from '../../router'
import { convertPathToHttpPath, createContractedProcedure, eachContractProcedure } from '../../utils'

export class RPCMatcher implements StandardMatcher {
  private readonly tree: Record<
    HTTPPath,
    {
      path: string[]
      contract: AnyContractProcedure
      maybeProcedure: AnyRouter | undefined | Lazy<undefined>
      contractedProcedure?: AnyProcedure
    }
  > = {}

  private readonly pendingRouters: (EachContractProcedureLaziedOptions & { httpPath: HTTPPath }) [] = []

  init(router: AnyRouter, path: string[] = []): void {
    const laziedOptions = eachContractProcedure({
      router,
      path,
    }, ({ path, contract }) => {
      const httpPath = convertPathToHttpPath(path)

      if (isProcedure(contract)) {
        this.tree[httpPath] = {
          path,
          contract,
          maybeProcedure: undefined,
          contractedProcedure: contract, // this mean dev not used contract-first so we can used contract as procedure directly
        }
      }
      else {
        this.tree[httpPath] = {
          path,
          contract,
          maybeProcedure: getRouterChild(router, ...path),
        }
      }
    })

    this.pendingRouters.push(...laziedOptions.map(option => ({
      ...option,
      httpPath: convertPathToHttpPath(option.path),
    })))
  }

  async match(_method: string, pathname: HTTPPath): Promise<StandardMatchResult> {
    for (const pendingRouter of this.pendingRouters) {
      if (pathname.startsWith(pendingRouter.httpPath)) {
        const { default: router } = await unlazy(pendingRouter.lazied)
        this.init(router, pendingRouter.path)
      }
    }

    const match = this.tree[pathname]

    if (!match) {
      return undefined
    }

    if (!match.contractedProcedure) {
      const { default: maybeProcedure } = await unlazy(match.maybeProcedure)

      if (!isProcedure(maybeProcedure)) {
        throw new Error(`
          [Contract-First] Missing or invalid implementation for procedure at path: ${convertPathToHttpPath(match.path)}.
          Ensure that the procedure is correctly defined and matches the expected contract.
        `)
      }

      match.contractedProcedure = createContractedProcedure(match.contract, maybeProcedure)
    }

    return {
      path: match.path,
      procedure: match.contractedProcedure,
    }
  }
}
