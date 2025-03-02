import type { StandardLazyRequest } from '@orpc/standard-server'
import type { NodeHttpRequest, NodeHttpResponse } from './types'
import { once } from '@orpc/shared'
import { toStandardBody } from './body'
import { toAbortSignal } from './signal'

export function toLazyStandardRequest(
  req: NodeHttpRequest,
  res: NodeHttpResponse,
): StandardLazyRequest {
  const method = req.method ?? 'GET'

  const protocol = ('encrypted' in req.socket && req.socket.encrypted ? 'https:' : 'http:')
  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.originalUrl ?? req.url ?? '/', `${protocol}//${host}`)

  return {
    raw: { request: req, response: res },
    method,
    url,
    headers: req.headers,
    body: once(() => toStandardBody(req)),
    signal: toAbortSignal(res),
  }
}
