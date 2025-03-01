import type { StandardResponse, StandardServerEventSourceOptions } from '@orpc/standard-server'
import { toFetchBody } from './body'
import { toFetchHeaders } from './headers'

export function toFetchResponse(response: StandardResponse, options: StandardServerEventSourceOptions): Response {
  const headers = toFetchHeaders(response.headers)
  const body = toFetchBody(response.body, headers, options)
  return new Response(body, { headers, status: response.status })
}
