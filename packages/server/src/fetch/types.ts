/// <reference lib="dom" />

import type { Hooks, PartialOnUndefinedDeep, Value } from '@orpc/shared'
import type { Router } from '../router'
import type { CallerOptions } from '../types'

export type FetchHandlerOptions<
  TRouter extends Router<any>,
> = {
  /**
   * The `router` used for handling the request and routing,
   *
   */
  router: TRouter

  /**
   * The request need to be handled.
   */
  request: Request

  /**
   * Remove the prefix from the request path.
   *
   * @example /orpc
   * @example /api
   */
  prefix?: string
} & PartialOnUndefinedDeep<{
  /**
   * The context used to handle the request.
   */
  context: Value<
    TRouter extends Router<infer UContext> ? UContext : never
  >
}>
& CallerOptions
& Hooks<Request, Response, TRouter extends Router<infer UContext> ? UContext : never, CallerOptions>

export type FetchHandler = <TRouter extends Router<any>>(
  options: FetchHandlerOptions<TRouter>
) => Promise<Response | undefined>
