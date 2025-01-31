/// <reference types="node" />

import type { HTTPPath } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '../../context'

export type RequestHandleOptions<T extends Context> =
  & { prefix?: HTTPPath, beforeSend?(response: Response, context: T): Promisable<void> }
  & (Record<never, never> extends T ? { context?: T } : { context: T })

export type RequestHandleRest<T extends Context> =
  | [options: RequestHandleOptions<T>]
  | (Record<never, never> extends T ? [] : never)

export type RequestHandleResult = { matched: true } | { matched: false }

export interface RequestHandler<T extends Context> {
  handle(req: IncomingMessage, res: ServerResponse, ...rest: RequestHandleRest<T>): Promise<RequestHandleResult>
}
