import type { JsonValue } from '@orpc/shared'

export class SSEErrorEvent extends Error {
  constructor(public data: undefined | JsonValue) {
    super('An SSE error event was received', { cause: data })
  }
}
