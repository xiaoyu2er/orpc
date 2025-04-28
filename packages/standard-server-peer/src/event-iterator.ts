import type { CreateAsyncIteratorObjectOptions } from '@orpc/shared'
import type { AsyncIdQueue, PullableAsyncIdQueue } from '../../shared/src/queue'
import type { EventIteratorPayload } from './codec'
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
  let isInternal = false

  try {
    while (true) {
      isInternal = false
      const { value, done } = await iterator.next()
      isInternal = true

      if (!queue.isOpen(id)) {
        if (!done) {
          isInternal = false
          await iterator.return?.()
          isInternal = true
        }

        return
      }

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
    let currentError = err

    if (isInternal) {
      try {
        await iterator.throw?.(currentError)
      }
      catch (err) {
        currentError = err
      }
    }

    if (queue.isOpen(id)) {
      queue.push(id, {
        meta: getEventMeta(currentError),
        event: 'error',
        data: currentError instanceof ErrorEvent ? currentError.data : undefined,
      })
    }
  }
  finally {
    options.onComplete?.()
  }
}
