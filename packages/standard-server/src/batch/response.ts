import type { StandardHeaders, StandardResponse } from '../types'
import { isAsyncIteratorObject, isObject } from '@orpc/shared'

export interface BatchResponseBodyItem extends StandardResponse {
  index: number
}

export interface ToBatchResponseOptions extends StandardResponse {
  body: AsyncIteratorObject<BatchResponseBodyItem>
}

export function toBatchResponse(options: ToBatchResponseOptions): StandardResponse {
  return {
    ...options,
    body: (async function* () {
      try {
        for await (const item of options.body) {
          yield {
            index: item.index,
            status: item.status === options.status ? undefined : item.status,
            headers: Object.keys(item.headers).length ? item.headers : undefined,
            body: item.body,
          } satisfies Partial<BatchResponseBodyItem>
        }
      }
      finally {
        options.body.return?.()
      }
    })(),
  }
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
        if (!isObject(item) || !('index' in item) || typeof item.index !== 'number') {
          throw new TypeError('Invalid batch response', {
            cause: item,
          })
        }

        yield {
          index: item.index as number,
          status: item.status as undefined | number ?? response.status,
          headers: item.headers as undefined | StandardHeaders ?? {},
          body: item.body,
        } satisfies BatchResponseBodyItem
      }
    }
    finally {
      await body.return?.()
    }
  })()
}
