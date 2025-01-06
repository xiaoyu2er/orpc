/// <reference types="node" />

import type { HTTPPath } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '../../types'

export type RequestHandleOptions<T extends Context> =
  & { prefix?: HTTPPath, beforeSend?: (response: Response, context: T) => Promisable<void> }
  & (undefined extends T ? { context?: T } : { context: T })

export type RequestHandleRest<T extends Context> = [options: RequestHandleOptions<T>] | (undefined extends T ? [] : never)

export type RequestHandleResult = { matched: true } | { matched: false }

export interface RequestHandler<T extends Context> {
  handle: (req: IncomingMessage, res: ServerResponse, ...rest: RequestHandleRest<T>) => Promise<RequestHandleResult>
}
