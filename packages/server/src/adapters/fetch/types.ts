import type { HTTPPath } from '@orpc/contract'
import type { Context } from '../../context'

export type FetchHandleOptions<T extends Context> =
  & { prefix?: HTTPPath }
  & (Record<never, never> extends T ? { context?: T } : { context: T })

export type FetchHandleRest<T extends Context> =
  | [options: FetchHandleOptions<T>]
  | (Record<never, never> extends T ? [] : never)

export type FetchHandleResult = { matched: true, response: Response } | { matched: false, response: undefined }

export interface FetchHandler<T extends Context> {
  handle: (request: Request, ...rest: FetchHandleRest<T>) => Promise<FetchHandleResult>
}
