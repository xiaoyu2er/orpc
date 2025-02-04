/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Http2ServerRequest, Http2ServerResponse } from 'node:http2'
import type { Context } from '../../context'
import type { StandardHandleRest } from '../standard'

export type NodeHttpRequest = (IncomingMessage | Http2ServerRequest) & {
  /**
   * Replace `req.url` with `req.originalUrl` when `req.originalUrl` is available.
   * This is useful for `express.js` middleware.
   */
  originalUrl?: string
}

export type NodeHttpResponse = ServerResponse | Http2ServerResponse

export type NodeHttpHandleResult = { matched: true } | { matched: false }

export interface NodeHttpHandler<T extends Context> {
  handle(req: NodeHttpRequest, res: NodeHttpResponse, ...rest: StandardHandleRest<T>): Promise<NodeHttpHandleResult>
}
