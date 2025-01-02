/// <reference types="node" />

import type { RequestListenerOptions } from '@mjackson/node-fetch-server'
import type { HTTPPath } from '@orpc/contract'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context, WithSignal } from '../../types'

export type RequestOptions<T extends Context> =
  & WithSignal
  & { prefix?: HTTPPath }
  & (undefined extends T ? { context?: T } : { context: T })
  & RequestListenerOptions

export interface RequestHandler<T extends Context> {
  handle: (req: IncomingMessage, res: ServerResponse, ...opt: [options: RequestOptions<T>] | (undefined extends T ? [] : never)) => void
}

export interface ConditionalRequestHandler<T extends Context> extends RequestHandler<T> {
  condition: (request: IncomingMessage) => boolean
}
