/// <reference lib="dom" />

import type { PartialOnUndefinedDeep, Promisable, Value } from '@orpc/shared'
import type { Router } from '../router'

export interface FetchHandlerHooks {
  next: () => Promise<Response>
  response: (response: Response) => Response
}

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

  /**
   * Hooks for executing logics on lifecycle events.
   */
  hooks?: (
    context: TRouter extends Router<infer UContext> ? UContext : never,
    hooks: FetchHandlerHooks,
  ) => Promisable<Response>
} & PartialOnUndefinedDeep<{
  /**
   * The context used to handle the request.
   */
  context: Value<
    TRouter extends Router<infer UContext> ? UContext : never
  >
}>

export type FetchHandler = <TRouter extends Router<any>>(
  options: FetchHandlerOptions<TRouter>
) => Promise<Response | undefined>
