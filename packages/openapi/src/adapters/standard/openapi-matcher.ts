import type { AnyProcedure, AnyRouter, EachContractProcedureLaziedOptions } from '@orpc/server'
import type { StandardMatcher, StandardMatchResult } from '@orpc/server/standard'
import { type AnyContractProcedure, fallbackContractConfig, type HTTPPath } from '@orpc/contract'
import { convertPathToHttpPath, createContractedProcedure, eachContractProcedure, getLazyRouterPrefix, getRouterChild, isProcedure, unlazy } from '@orpc/server'
import { addRoute, createRouter, findRoute } from 'rou3'
import { standardizeHTTPPath } from '../../utils'

export interface OpenAPIMatcherOptions {
  /**
   * Ignore procedure that does not have a method defined in the contract.
   *
   * @default false
   */
  ignoreUndefinedMethod?: boolean
}

export class OpenAPIMatcher implements StandardMatcher {
  private readonly tree = createRouter<{
    path: string[]
    contract: AnyContractProcedure
    procedure: AnyProcedure | undefined
    router: AnyRouter
  }>()

  private readonly ignoreUndefinedMethod: boolean

  constructor(
    options?: OpenAPIMatcherOptions,
  ) {
    this.ignoreUndefinedMethod = options?.ignoreUndefinedMethod ?? false
  }

  private pendingRouters: (EachContractProcedureLaziedOptions & { httpPathPrefix: HTTPPath, laziedPrefix: string | undefined }) [] = []

  init(router: AnyRouter, path: string[] = []): void {
    const laziedOptions = eachContractProcedure({
      router,
      path,
    }, ({ path, contract }) => {
      if (!contract['~orpc'].route.method && this.ignoreUndefinedMethod) {
        return
      }

      const method = fallbackContractConfig('defaultMethod', contract['~orpc'].route.method)
      const httpPath = contract['~orpc'].route.path
        ? toRou3Pattern(contract['~orpc'].route.path)
        : convertPathToHttpPath(path)

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

    this.pendingRouters.push(...laziedOptions.map(option => ({
      ...option,
      httpPathPrefix: convertPathToHttpPath(option.path),
      laziedPrefix: getLazyRouterPrefix(option.lazied),
    })))
  }

  async match(method: string, pathname: HTTPPath): Promise<StandardMatchResult> {
    if (this.pendingRouters.length) {
      const newPendingRouters: typeof this.pendingRouters = []

      for (const pendingRouter of this.pendingRouters) {
        if (
          !pendingRouter.laziedPrefix
          || pathname.startsWith(pendingRouter.laziedPrefix)
          || pathname.startsWith(pendingRouter.httpPathPrefix)
        ) {
          const { default: router } = await unlazy(pendingRouter.lazied)
          this.init(router, pendingRouter.path)
        }
        else {
          newPendingRouters.push(pendingRouter)
        }
      }

      this.pendingRouters = newPendingRouters
    }

    const match = findRoute(this.tree, method, pathname)

    if (!match) {
      return undefined
    }

    if (!match.data.procedure) {
      const { default: maybeProcedure } = await unlazy(getRouterChild(match.data.router, ...match.data.path))

      if (!isProcedure(maybeProcedure)) {
        throw new Error(`
          [Contract-First] Missing or invalid implementation for procedure at path: ${convertPathToHttpPath(match.data.path)}.
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

/**
 * {@link https://github.com/unjs/rou3}
 */
function toRou3Pattern(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\{\+([^}]+)\}/g, '**:$1').replace(/\{([^}]+)\}/g, ':$1')
}

function decodeParams(params: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, decodeURIComponent(value)]))
}
