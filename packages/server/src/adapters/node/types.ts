/// <reference types="node" />

import type { RequestOptions as BaseRequestOptions } from '@mjackson/node-fetch-server'
import type { HTTPPath } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context, WithSignal } from '../../types'

export type RequestOptions<T extends Context, TReturnFalseOnNoMatch extends boolean> =
  & BaseRequestOptions
  & WithSignal
  & {
    prefix?: HTTPPath
    returnFalseOnNoMatch?: TReturnFalseOnNoMatch
    beforeSend?: (response: Response, context: T) => Promisable<void>
  }
  & (undefined extends T ? { context?: T } : { context: T })

export interface RequestHandler<T extends Context> {
  handle: <UReturnFalseOnNoMatch extends boolean = false>(
    req: IncomingMessage,
    res: ServerResponse,
    ...opt: [options: RequestOptions<T, UReturnFalseOnNoMatch>] | (undefined extends T ? [] : never)
  ) => Promise<void | (true extends UReturnFalseOnNoMatch ? false : never)>
}

export interface ConditionalRequestHandler<T extends Context> extends RequestHandler<T> {
  condition: (request: IncomingMessage) => boolean
}
