import { Readable } from 'node:stream'
import { isTypescriptObject, parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import {
  encodeEventMessage,
  ErrorEvent,
  EventDecoderStream,
  getEventMeta,
  withEventMeta,
} from '@orpc/standard-server'

export function toEventIterator(
  stream: Readable,
): AsyncGenerator<unknown | void, unknown | void, void> {
  const eventStream = Readable.toWeb(stream)
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventDecoderStream())

  const reader = eventStream.getReader()

  async function* gen() {
    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          return
        }

        switch (value.event) {
          case 'message': {
            let message = parseEmptyableJSON(value.data)

            if (isTypescriptObject(message)) {
              message = withEventMeta(message, value)
            }

            yield message
            break
          }

          case 'error': {
            let error = new ErrorEvent({
              data: parseEmptyableJSON(value.data),
            })

            error = withEventMeta(error, value)

            throw error
          }

          case 'done': {
            let done = parseEmptyableJSON(value.data)

            if (isTypescriptObject(done)) {
              done = withEventMeta(done, value)
            }

            return done
          }
        }
      }
    }
    finally {
      await reader.cancel()
    }
  }

  return gen()
}

export interface ToEventStreamOptions {
  /**
   * If true, a ping comment is sent periodically to keep the connection alive.
   *
   * @default true
   */
  eventIteratorKeepAliveEnabled?: boolean

  /**
   * Interval (in milliseconds) between ping comments sent after the last event.
   *
   * @default 5000
   */
  eventIteratorKeepAliveInterval?: number

  /**
   * The content of the ping comment. Must not include newline characters.
   *
   * @default ''
   */
  eventIteratorKeepAliveComment?: string
}

export function toEventStream(
  iterator: AsyncIterator<unknown | void, unknown | void, void>,
  options: ToEventStreamOptions = {},
): Readable {
  const keepAliveEnabled = options.eventIteratorKeepAliveEnabled ?? true
  const keepAliveInterval = options.eventIteratorKeepAliveInterval ?? 5000
  const keepAliveComment = options.eventIteratorKeepAliveComment ?? ''

  let cancelled = false
  let timeout: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream<string>({
    async pull(controller) {
      try {
        if (keepAliveEnabled) {
          timeout = setInterval(() => {
            controller.enqueue(encodeEventMessage({
              comments: [keepAliveComment],
            }))
          }, keepAliveInterval)
        }

        const value = await iterator.next()

        clearInterval(timeout)

        if (cancelled) {
          return
        }

        const meta = getEventMeta(value.value)

        if (!value.done || value.value !== undefined || meta !== undefined) {
          controller.enqueue(encodeEventMessage({
            ...meta,
            event: value.done ? 'done' : 'message',
            data: stringifyJSON(value.value),
          }))
        }

        if (value.done) {
          controller.close()
        }
      }
      catch (err) {
        clearInterval(timeout)

        if (cancelled) {
          return
        }

        controller.enqueue(encodeEventMessage({
          ...getEventMeta(err),
          event: 'error',
          data: err instanceof ErrorEvent ? stringifyJSON(err.data) : undefined,
        }))

        controller.close()
      }
    },
    async cancel(reason) {
      cancelled = true
      clearInterval(timeout)

      if (reason) {
        await iterator.throw?.(reason)
      }
      else {
        await iterator.return?.()
      }
    },
  })

  return Readable.fromWeb(stream)
}
