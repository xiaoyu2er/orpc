import type { StandardHeaders, StandardRequest } from '@orpc/standard-server'
import { parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import { toBatchAbortSignal } from './signal'

export interface ToBatchRequestOptions {
  url: URL
  method: 'GET' | 'POST'
  headers: StandardHeaders
  requests: readonly StandardRequest[]
}

export function toBatchRequest(options: ToBatchRequestOptions): StandardRequest {
  const url = new URL(options.url)
  let body: unknown

  if (options.method === 'GET') {
    url.searchParams.append('batch', stringifyJSON(options.requests))
  }

  else if (options.method === 'POST') {
    body = options.requests
  }

  return {
    method: options.method,
    url,
    headers: options.headers,
    body,
    signal: toBatchAbortSignal(options.requests.map(request => request.signal)),
  }
}

export function toStandardRequests(request: StandardRequest): StandardRequest[] {
  const items = request.method === 'GET'
    ? parseEmptyableJSON(request.url.searchParams.getAll('batch').at(-1))
    : request.body

  if (!Array.isArray(items)) {
    throw new TypeError('Invalid batch request')
  }

  return items.map((item) => {
    return {
      method: item.method,
      url: new URL(item.url),
      headers: item.headers,
      body: item.body,
      signal: request.signal,
    } satisfies StandardRequest
  })
}
