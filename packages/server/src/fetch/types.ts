import type { HTTPPath } from '@orpc/contract'
import type { Value } from '@orpc/shared'
import type { Context, WithSignal } from '../types'

export type FetchOptions<T extends Context> = {
  /**
   * Remove the prefix from the request path.
   *
   * @example /orpc
   * @example /api
   */
  prefix?: HTTPPath
}
& NoInfer<(undefined extends T ? { context?: Value<T> } : { context: Value<T> })>
& WithSignal

export interface FetchHandler<T extends Context> {
  fetch: (request: Request, options: FetchOptions<T>) => Promise<Response>
}
