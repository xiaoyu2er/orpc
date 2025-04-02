import type { StandardResponse } from '@orpc/standard-server'
import { isAsyncIteratorObject } from '@orpc/shared'

export function toBatchResponseBody(body: AsyncIteratorObject<StandardResponse>): AsyncGenerator<unknown> {
  return (async function* () {
    try {
      for await (const response of body) {
        if (!isAsyncIteratorObject(response.body)) {
          return response
        }
      }
    }
    finally {
      await body.return?.()
    }
  })()
}
