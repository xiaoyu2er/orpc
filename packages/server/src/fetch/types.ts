import type { HTTPPath } from '@orpc/contract'
import type { Context, WithSignal } from '../types'

export type FetchOptions<T extends Context> =
  & WithSignal
  & { prefix?: HTTPPath }
  & (undefined extends T ? { context?: T } : { context: T })

export interface FetchHandler<T extends Context> {
  fetch: (
    request: Request,
    ...opt: [options: FetchOptions<T>] | (undefined extends T ? [] : never)
  ) => Promise<Response>
}
