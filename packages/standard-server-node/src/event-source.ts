import { Readable } from 'node:stream'
import { isTypescriptObject, parseEmptyableJSON } from '@orpc/shared'
import {
  encodeEventMessage,
  ErrorEvent,
  EventDecoderStream,
  getEventMeta,
  UnknownEvent,
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

          default: {
            let error = new UnknownEvent({
              message: `Unknown event: ${value.event}`,
              data: parseEmptyableJSON(value.data),
            })

            error = withEventMeta(error, value)

            throw error
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

export function toEventStream(
  iterator: AsyncIterator<unknown | void, unknown | void, void>,
): Readable {
  const stream = new ReadableStream<string>({
    async pull(controller) {
      try {
        const value = await iterator.next()

        controller.enqueue(encodeEventMessage({
          ...getEventMeta(value.value),
          event: value.done ? 'done' : 'message',
          data: JSON.stringify(value.value),
        }))

        if (value.done) {
          controller.close()
        }
      }
      catch (err) {
        controller.enqueue(encodeEventMessage({
          ...getEventMeta(err),
          event: 'error',
          data: err instanceof ErrorEvent ? JSON.stringify(err.data) : undefined,
        }))

        controller.close()
      }
    },
    async cancel(reason) {
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
