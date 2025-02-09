import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { StandardHandleOptions } from '../standard'

export type FetchHandleResult = { matched: true, response: Response } | { matched: false, response: undefined }

export interface FetchHandler<T extends Context> {
  handle(request: Request, ...rest: MaybeOptionalOptions<StandardHandleOptions<T>>): Promise<FetchHandleResult>
}
