import type { StandardHeaders, StandardLazyResponse, StandardResponse } from '@orpc/standard-server'
import { isAsyncIteratorObject, isObject } from '@orpc/shared'

export interface ToBatchResponseOptions {
  headers: StandardHeaders
  body: AsyncIterator<StandardResponse>
}

export function toBatchResponse(options: ToBatchResponseOptions): StandardResponse {
  return {
    status: 200,
    headers: options.headers,
    body: options.body,
  }
}

export function toStandardResponse(response: StandardLazyResponse): AsyncGenerator<StandardResponse> {
  return (async function* () {
    const body = await response.body()

    if (!isAsyncIteratorObject(body)) {
      throw new TypeError('Invalid batch response')
    }

    for await (const item of body) {
      if (!isObject(item)) {
        throw new TypeError('Invalid batch response')
      }

      if (!('iterator' in item)) {
        yield item
      }
    }
  })()
}
