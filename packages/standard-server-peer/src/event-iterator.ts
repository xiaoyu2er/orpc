import type { CreateAsyncIteratorObjectOptions } from '@orpc/shared'
import type { EventIteratorPayload } from './codec'
import type { AsyncIdQueue, PullableAsyncIdQueue } from './queue'
import { createAsyncIteratorObject, isTypescriptObject } from '@orpc/shared'
import { ErrorEvent, getEventMeta, withEventMeta } from '@orpc/standard-server'

export function toEventIterator(
  queue: PullableAsyncIdQueue<EventIteratorPayload>,
  id: number,
  options: CreateAsyncIteratorObjectOptions = {},
): AsyncGenerator {
  return createAsyncIteratorObject(async () => {
    const item = await queue.pull(id)

    switch (item.event) {
      case 'message': {
        let data = item.data

        if (item.meta && isTypescriptObject(data)) {
          data = withEventMeta(data, item.meta)
        }

        return { value: data, done: false }
      }

      case 'error': {
        let error = new ErrorEvent({
          data: item.data,
        })

        if (item.meta) {
          error = withEventMeta(error, item.meta)
        }

        throw error
      }

      case 'done': {
        let data = item.data

        if (item.meta && isTypescriptObject(data)) {
          data = withEventMeta(data, item.meta)
        }

        return { value: data, done: true }
      }
    }
  }, options)
}

export async function sendEventIterator(
  queue: AsyncIdQueue<EventIteratorPayload>,
  id: number,
  iterator: AsyncIterator<any>,
  options: { onComplete?: () => void } = {},
): Promise<void> {
  try {
    while (true) {
      const { value, done } = await iterator.next()

      queue.push(id, {
        event: done ? 'done' : 'message',
        data: value,
        meta: getEventMeta(value),
      })

      if (done) {
        return
      }
    }
  }
  catch (err) {
    queue.push(id, {
      meta: getEventMeta(err),
      event: 'error',
      data: err instanceof ErrorEvent ? err.data : undefined,
    })
  }
  finally {
    options.onComplete?.()
  }
}
