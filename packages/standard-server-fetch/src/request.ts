import type { StandardLazyRequest, StandardRequest } from '@orpc/standard-server'
import type { ToFetchBodyOptions } from './body'
import { once } from '@orpc/shared'
import { toFetchBody, toStandardBody } from './body'
import { toFetchHeaders, toStandardHeaders } from './headers'

export function toStandardLazyRequest(request: Request): StandardLazyRequest {
  const raw = { adapter: 'fetch', request }

  return {
    raw,
    url: new URL(request.url),
    signal: request.signal,
    method: request.method,
    body: once(() => toStandardBody(raw.request)),
    get headers() {
      const headers = toStandardHeaders(raw.request.headers)
      Object.defineProperty(this, 'headers', { value: headers, writable: true })
      return headers
    },
    set headers(value) {
      Object.defineProperty(this, 'headers', { value, writable: true })
    },
  }
}

export interface ToFetchRequestOptions extends ToFetchBodyOptions {}

export function toFetchRequest(request: StandardRequest, options: ToFetchRequestOptions = {}): Request {
  const headers = toFetchHeaders(request.headers)
  const body = toFetchBody(request.body, headers, options)

  return new Request(request.url, {
    signal: request.signal,
    method: request.method,
    headers,
    body,
  })
}
