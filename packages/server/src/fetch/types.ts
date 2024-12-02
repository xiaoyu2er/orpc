/// <reference lib="dom" />

import type { ContractRouter } from '@orpc/contract'
import type { PartialOnUndefinedDeep, Promisable, Value } from '@orpc/shared'
import type { Router, RouterWithContract } from '../router'

export interface FetchHandlerHooks {
  next: () => Promise<Response>
  response: (response: Response) => Response
}

export type FetchHandlerOptions<
  TContractRouter extends ContractRouter | undefined,
  TRouter extends Router<any>,
> = {
  /**
   * The `contract router` used for routing the request.
   * If not provided, the `router` will be used.
   *
   * @default undefined
   */
  contract?: TContractRouter

  /**
   * The `router` used for handling the request,
   * and routing if `contract` is not provided.
   *
   */
  router: TRouter & (TContractRouter extends ContractRouter ? RouterWithContract<any, TContractRouter> : unknown)

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

export type FetchHandler = <
  TContractRouter extends ContractRouter | undefined,
  TRouter extends Router<any>,
>(
  options: FetchHandlerOptions<TContractRouter, TRouter>
) => Promise<Response | undefined>
