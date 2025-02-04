import type { Context } from '../../context'
import type { StandardHandleRest } from '../standard'

export type FetchHandleResult = { matched: true, response: Response } | { matched: false, response: undefined }

export interface FetchHandler<T extends Context> {
  handle(request: Request, ...rest: StandardHandleRest<T>): Promise<FetchHandleResult>
}
