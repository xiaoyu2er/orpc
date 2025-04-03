import type { StandardHeaders, StandardResponse } from '../types'
import { isAsyncIteratorObject, isObject } from '@orpc/shared'

export interface BatchResponseBodyItem extends StandardResponse {
  index: number
}

export interface ToBatchResponseOptions {
  status: number
  headers: StandardHeaders
  body: AsyncIterator<BatchResponseBodyItem>
}

export function toBatchResponse(options: ToBatchResponseOptions): StandardResponse {
  return {
    status: options.status,
    headers: options.headers,
    body: options.body,
  }
}

export function parseBatchResponse(response: StandardResponse): AsyncGenerator<BatchResponseBodyItem> {
  const body = response.body

  if (!isAsyncIteratorObject(body)) {
    throw new TypeError('Invalid batch response')
  }

  return (async function* () {
    try {
      for await (const item of body) {
        if (!isObject(item) || !('index' in item) || !('status' in item) || !('headers' in item)) {
          throw new TypeError('Invalid batch response')
        }

        yield item as unknown as BatchResponseBodyItem
      }
    }
    finally {
      await body.return?.()
    }
  })()
}
