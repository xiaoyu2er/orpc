import type { StandardLazyRequest } from '@orpc/standard-server'
import type Stream from 'node:stream'
import type { APIGatewayProxyEventV2 } from './types'
import { once } from '@orpc/shared'
import { toStandardBody } from './body'
import { toStandardHeaders } from './headers'
import { toAbortSignal } from './signal'
import { toStandardUrl } from './url'

export function toStandardLazyRequest(event: APIGatewayProxyEventV2, responseStream: Stream.Writable): StandardLazyRequest {
  return {
    url: toStandardUrl(event),
    method: event.requestContext.http.method,
    get headers() {
      const headers = toStandardHeaders(event.headers, event.cookies)
      Object.defineProperty(this, 'headers', { value: headers, writable: true })
      return headers
    },
    set headers(value) {
      Object.defineProperty(this, 'headers', { value, writable: true })
    },
    signal: toAbortSignal(responseStream),
    body: once(() => toStandardBody(event)),
  }
}
