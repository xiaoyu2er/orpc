import type { StandardHeaders } from '@orpc/standard-server'
import type { HTTPPath } from '../../types'
import { toStandardHeaders as fetchHeadersToStandardHeaders } from '@orpc/standard-server-fetch'
import { COMMON_ORPC_ERROR_DEFS } from '../../error'

export function toHttpPath(path: readonly string[]): HTTPPath {
  return `/${path.map(encodeURIComponent).join('/')}`
}

export function toStandardHeaders(headers: Headers | StandardHeaders): StandardHeaders {
  /**
   * The Headers constructor might not be available in all environments since these are standard APIs.
   */
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return fetchHeadersToStandardHeaders(headers)
  }

  return headers as StandardHeaders
}

export function getMalformedResponseErrorCode(status: number): string {
  return Object.entries(COMMON_ORPC_ERROR_DEFS).find(([, def]) => def.status === status)?.[0] ?? 'MALFORMED_ORPC_ERROR_RESPONSE'
}
