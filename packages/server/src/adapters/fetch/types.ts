import type { HTTPPath } from '@orpc/contract'
import type { Context } from '../../types'

export type FetchHandleOptions<T extends Context> =
  & { prefix?: HTTPPath }
  & (undefined extends T ? { context?: T } : { context: T })

export type FetchHandleRest<T extends Context> = [options: FetchHandleOptions<T>] | (undefined extends T ? [] : never)
export type FetchHandleResult = { matched: true, response: Response } | { matched: false, response: undefined }

export interface FetchHandler<T extends Context> {
  handle: (request: Request, ...rest: FetchHandleRest<T>) => Promise<FetchHandleResult>
}

export interface ConditionalFetchHandler<T extends Context> extends FetchHandler<T> {
  condition: (request: Request, ...rest: FetchHandleRest<T>) => boolean
}
