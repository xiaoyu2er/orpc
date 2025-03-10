import type { AnyProcedure, AnyRouter, LazyTraverseContractProceduresOptions } from '@orpc/server'
import type { StandardMatcher, StandardMatchResult } from '@orpc/server/standard'
import { type AnyContractProcedure, fallbackContractConfig, getLazyMeta, type HTTPPath, unlazy } from '@orpc/contract'
import { createContractedProcedure, getRouter, isProcedure, toHttpPath, traverseContractProcedures } from '@orpc/server'
import { addRoute, createRouter, findRoute } from 'rou3'
import { decodeParams, toRou3Pattern } from './utils'

export class OpenAPIMatcher implements StandardMatcher {
  private readonly tree = createRouter<{
    path: readonly string[]
    contract: AnyContractProcedure
    procedure: AnyProcedure | undefined
    router: AnyRouter
  }>()

  private lazyTraverseOptions: (LazyTraverseContractProceduresOptions & { httpPathPrefix: HTTPPath, laziedPrefix: string | undefined }) [] = []

  init(router: AnyRouter, path: readonly string[] = []): void {
    const laziedOptions = traverseContractProcedures({ router, path }, ({ path, contract }) => {
      const method = fallbackContractConfig('defaultMethod', contract['~orpc'].route.method)
      const httpPath = toRou3Pattern(contract['~orpc'].route.path ?? toHttpPath(path))

      if (isProcedure(contract)) {
        addRoute(this.tree, method, httpPath, {
          path,
          contract,
          procedure: contract, // this mean dev not used contract-first so we can used contract as procedure directly
          router,
        })
      }
      else {
        addRoute(this.tree, method, httpPath, {
          path,
          contract,
          procedure: undefined,
          router,
        })
      }
    })

    this.lazyTraverseOptions.push(...laziedOptions.map(option => ({
      ...option,
      httpPathPrefix: toHttpPath(option.path),
      laziedPrefix: getLazyMeta(option.router).prefix,
    })))
  }

  async match(method: string, pathname: HTTPPath): Promise<StandardMatchResult> {
    if (this.lazyTraverseOptions.length) {
      const newLazyTraverseOptions: typeof this.lazyTraverseOptions = []

      for (const pendingRouter of this.lazyTraverseOptions) {
        if (
          !pendingRouter.laziedPrefix
          || pathname.startsWith(pendingRouter.laziedPrefix)
          || pathname.startsWith(pendingRouter.httpPathPrefix)
        ) {
          const { default: router } = await unlazy(pendingRouter.router)
          this.init(router, pendingRouter.path)
        }
        else {
          newLazyTraverseOptions.push(pendingRouter)
        }
      }

      this.lazyTraverseOptions = newLazyTraverseOptions
    }

    const match = findRoute(this.tree, method, pathname)

    if (!match) {
      return undefined
    }

    if (!match.data.procedure) {
      const { default: maybeProcedure } = await unlazy(getRouter(match.data.router, match.data.path))

      if (!isProcedure(maybeProcedure)) {
        throw new Error(`
          [Contract-First] Missing or invalid implementation for procedure at path: ${toHttpPath(match.data.path)}.
          Ensure that the procedure is correctly defined and matches the expected contract.
        `)
      }

      match.data.procedure = createContractedProcedure(match.data.contract, maybeProcedure)
    }

    return {
      path: match.data.path,
      procedure: match.data.procedure,
      params: match.params ? decodeParams(match.params) : undefined,
    }
  }
}
