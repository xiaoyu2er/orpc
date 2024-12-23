import type { Router as BaseHono, ParamIndexMap, Params } from 'hono/router'
import { type ANY_PROCEDURE, type ANY_ROUTER, getLazyRouterPrefix, getRouterChild, isProcedure, unlazy } from '@orpc/server'
import { mapValues } from '@orpc/shared'
import { forEachContractProcedure } from '../utils'
import { convertOpenAPIPathToRouterPath } from './utils'

export type Hono = BaseHono<[string, string[]]>

type PendingRouter = { path: string[], router: ANY_ROUTER }
type PendingRoutersRef = { value: PendingRouter[] }
const caches = new WeakMap<ANY_ROUTER, WeakMap<Hono, PendingRoutersRef>>()

export class OpenAPIMatcher {
  private pendingRoutersRef: PendingRoutersRef

  constructor(
    private readonly hono: Hono,
    private readonly router: ANY_ROUTER,
  ) {
    let cache = caches.get(router)
    if (!cache) {
      cache = new WeakMap()
      caches.set(router, cache)
    }

    let pending = cache.get(hono)
    if (!pending) {
      pending = { value: [{ path: [], router }] }
      cache.set(hono, pending)
    }

    this.pendingRoutersRef = pending
  }

  async match(
    method: string,
    pathname: string,
  ): Promise<{ path: string[], procedure: ANY_PROCEDURE, params: Params } | undefined> {
    await this.handlePendingRouters(pathname)

    const [matches, paramStash] = this.hono.match(method, pathname)

    const [match] = matches.sort((a, b) => {
      const slashCountA = a[0][0].split('/').length
      const slashCountB = b[0][0].split('/').length

      if (slashCountA !== slashCountB) {
        /**
         * More slashes in the path means it's more specific.
         * So, we want push the path with more slashes to the start of the array.
         */
        return slashCountB - slashCountA
      }

      const paramsCountA = Object.keys(a[1]).length
      const paramsCountB = Object.keys(b[1]).length

      /**
       * More params in the path mean it's less specific.
       * So, we want to push the path with fewer params to the start of the array.
       */
      return paramsCountA - paramsCountB
    })

    if (!match) {
      return undefined
    }

    const path = match[0][1]
    const params = paramStash
      ? mapValues<number, string, string>(
        match[1] as ParamIndexMap, // if paramStash is defined, then match[1] is ParamIndexMap
        v => paramStash[v]!,
      )
      : match[1] as Params // if paramStash is undefined, then match[1] is Params

    const { default: maybeProcedure } = await unlazy(getRouterChild(this.router, ...path))

    if (!isProcedure(maybeProcedure)) {
      return undefined
    }

    return {
      path,
      procedure: maybeProcedure,
      params: { ...params }, // normalize params from hono
    }
  }

  private add(path: string[], router: ANY_ROUTER): void {
    const lazies = forEachContractProcedure({ path, router }, ({ path, contract }) => {
      const method = contract['~orpc'].route?.method ?? 'POST'
      const httpPath = contract['~orpc'].route?.path
        ? convertOpenAPIPathToRouterPath(contract['~orpc'].route?.path)
        : `/${path.map(encodeURIComponent).join('/')}`

      this.hono.add(method, httpPath, [httpPath, path])
    })

    this.pendingRoutersRef.value.push(...lazies)
  }

  private async handlePendingRouters(pathname: string): Promise<void> {
    const newPendingLazyRouters: PendingRouter[] = []

    for (const item of this.pendingRoutersRef.value) {
      const lazyPrefix = getLazyRouterPrefix(item.router)

      if (
        lazyPrefix
        && !pathname.startsWith(lazyPrefix)
        && !pathname.startsWith(`/${item.path.map(encodeURIComponent).join('/')}`)
      ) {
        newPendingLazyRouters.push(item)
        continue
      }

      const { default: router } = await unlazy(item.router)

      this.add(item.path, router)
    }

    this.pendingRoutersRef.value = newPendingLazyRouters
  }
}
