import type { StandardResponse } from '@orpc/standard-server'
import type { ToFetchBodyOptions } from './body'
import { toFetchBody } from './body'
import { toFetchHeaders } from './headers'

export interface ToFetchResponseOptions extends ToFetchBodyOptions {}

export function toFetchResponse(response: StandardResponse, options: ToFetchResponseOptions): Response {
  const headers = toFetchHeaders(response.headers)
  const body = toFetchBody(response.body, headers, options)
  return new Response(body, { headers, status: response.status })
}
