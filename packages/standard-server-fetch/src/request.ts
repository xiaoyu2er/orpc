import type { LazyStandardRequest } from '@orpc/standard-server'
import { once } from '@orpc/shared'
import { toStandardBody } from './body'
import { toStandardHeaders } from './headers'

export function toLazyStandardRequest(request: Request): LazyStandardRequest {
  return {
    raw: { request },
    url: new URL(request.url),
    signal: request.signal,
    method: request.method,
    body: once(() => toStandardBody(request)),
    get headers() {
      const headers = toStandardHeaders(request.headers)
      Object.defineProperty(this, 'headers', { value: headers, writable: true })
      return headers
    },
    set headers(value) {
      Object.defineProperty(this, 'headers', { value, writable: true })
    },
  }
}
