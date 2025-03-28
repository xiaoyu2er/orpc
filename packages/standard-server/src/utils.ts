import type { StandardHeaders } from './types'
import { toArray } from '@orpc/shared'

export { contentDisposition, parse as parseContentDisposition } from '@tinyhttp/content-disposition'

export function mergeStandardHeaders(a: StandardHeaders, b: StandardHeaders): StandardHeaders {
  const merged = { ...a }

  for (const key in b) {
    if (Array.isArray(b[key])) {
      merged[key] = [...toArray(merged[key]), ...b[key]]
    }
    else if (b[key] !== undefined) {
      if (Array.isArray(merged[key])) {
        merged[key] = [...merged[key], b[key]]
      }
      else if (merged[key] !== undefined) {
        merged[key] = [merged[key], b[key]]
      }
      else {
        merged[key] = b[key]
      }
    }
  }

  return merged
}
