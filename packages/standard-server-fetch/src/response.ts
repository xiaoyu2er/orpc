import type { StandardEventSourceOptions, StandardResponse } from '@orpc/standard-server'
import { toFetchBody } from './body'
import { toFetchHeaders } from './headers'

export function toFetchResponse(response: StandardResponse, options: StandardEventSourceOptions): Response {
  const headers = toFetchHeaders(response.headers)
  const body = toFetchBody(response.body, headers, options)
  return new Response(body, { headers, status: response.status })
}
