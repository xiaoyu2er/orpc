import type { StandardResponse } from '../types'
import { isAsyncIteratorObject, isObject } from '@orpc/shared'

export interface BatchResponseBodyItem extends StandardResponse {
  index: number
}

export interface ToBatchResponseOptions extends StandardResponse {
  body: AsyncIteratorObject<BatchResponseBodyItem>
}

export function toBatchResponse(options: ToBatchResponseOptions): StandardResponse {
  return options
}

export function parseBatchResponse(response: StandardResponse): AsyncGenerator<BatchResponseBodyItem> {
  const body = response.body

  if (!isAsyncIteratorObject(body)) {
    throw new TypeError('Invalid batch response', {
      cause: response,
    })
  }

  return (async function* () {
    try {
      for await (const item of body) {
        if (!isObject(item) || !('index' in item) || !('status' in item) || !('headers' in item)) {
          throw new TypeError('Invalid batch response', {
            cause: item,
          })
        }

        yield item as unknown as BatchResponseBodyItem
      }
    }
    finally {
      await body.return?.()
    }
  })()
}
