import type { AsyncIteratorClassCleanupFn, SetSpanErrorOptions } from '@orpc/shared'
import type { AsyncIdQueue } from '../../shared/src/queue'
import type { EventIteratorPayload } from './codec'
import { AsyncIteratorClass, isTypescriptObject, runInSpanContext, setSpanError, startSpan } from '@orpc/shared'
import { ErrorEvent, getEventMeta, withEventMeta } from '@orpc/standard-server'

export function toEventIterator(
  queue: AsyncIdQueue<EventIteratorPayload>,
  id: string,
  cleanup: AsyncIteratorClassCleanupFn,
  options: SetSpanErrorOptions = {},
): AsyncIteratorClass<unknown> {
  let span: ReturnType<typeof startSpan> | undefined

  return new AsyncIteratorClass(async () => {
    span ??= startSpan('consume_event_iterator_stream')

    try {
      const item = await runInSpanContext(span, () => queue.pull(id))

      switch (item.event) {
        case 'message': {
          let data = item.data

          if (item.meta && isTypescriptObject(data)) {
            data = withEventMeta(data, item.meta)
          }

          span?.addEvent('message')

          return { value: data, done: false }
        }

        case 'error': {
          let error = new ErrorEvent({
            data: item.data,
          })

          if (item.meta) {
            error = withEventMeta(error, item.meta)
          }

          span?.addEvent('error')

          throw error
        }

        case 'done': {
          let data = item.data

          if (item.meta && isTypescriptObject(data)) {
            data = withEventMeta(data, item.meta)
          }

          span?.addEvent('done')

          return { value: data, done: true }
        }
      }
    }
    catch (e) {
      /**
       * Shouldn't treat an error event as an error.
       */
      if (!(e instanceof ErrorEvent)) {
        setSpanError(span, e, options)
      }

      throw e
    }
  }, cleanup)
}

export async function resolveEventIterator(
  iterator: AsyncIterator<any>,
  callback: (payload: EventIteratorPayload) => Promise<'next' | 'abort'>,
): Promise<void> {
  while (true) {
    const payload: EventIteratorPayload = await (async () => {
      try {
        const { value, done } = await iterator.next()

        if (done) {
          return { event: 'done', data: value, meta: getEventMeta(value) }
        }

        return { event: 'message', data: value, meta: getEventMeta(value) }
      }
      catch (err) {
        /**
         * Shouldn't treat an error event as an error.
         */
        if (err instanceof ErrorEvent) {
          return {
            event: 'error',
            data: err.data,
            meta: getEventMeta(err),
          }
        }
        else {
          throw err
        }
      }
    })()

    let isInvokeCleanupFn = false

    try {
      const direction = await callback(payload)

      if (payload.event === 'done' || payload.event === 'error') {
        return
      }

      if (direction === 'abort') {
        isInvokeCleanupFn = true
        await iterator.return?.()
        return
      }
    }
    catch (err) {
      if (!isInvokeCleanupFn) {
        await iterator.return?.()
      }
      throw err
    }
  }
}
