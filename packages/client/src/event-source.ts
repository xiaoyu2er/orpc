import type { EventIteratorState } from './event-source-state'
import { getEventSourceMeta } from '@orpc/server-standard'
import { retry } from '@orpc/shared'
import { registerEventIteratorState, updateEventIteratorStatus } from './event-source-state'

export interface EventSourceIteratorReconnectOptions {
  lastRetry: number | undefined
  lastEventId: string | undefined
  retryTimes: number
  error: unknown
}

const MAX_ALLOWED_RETRY_TIMES = 99

export function createAutoRetryEventSourceIterator<TYield, TReturn>(
  initial: AsyncIterator<TYield, TReturn, void>,
  reconnect: (options: EventSourceIteratorReconnectOptions) => Promise<AsyncIterator<TYield, TReturn, void> | null>,
  initialLastEventId: string | undefined,
): AsyncGenerator<TYield, TReturn, void> {
  const state: EventIteratorState = {
    status: 'connected',
    listeners: [],
  }

  const iterator = (async function* () {
    let current = initial
    let lastEventId = initialLastEventId
    let lastRetry: number | undefined
    let retryTimes = 0

    try {
      while (true) {
        try {
          updateEventIteratorStatus(state, 'connected')

          const { done, value } = await current.next()

          const meta = getEventSourceMeta(value)

          lastEventId = meta?.id ?? lastEventId
          lastRetry = meta?.retry ?? lastRetry
          retryTimes = 0

          if (done) {
            return value
          }

          yield value
        }
        catch (e) {
          updateEventIteratorStatus(state, 'reconnecting')

          const meta = getEventSourceMeta(e)
          lastEventId = meta?.id ?? lastEventId
          lastRetry = meta?.retry ?? lastRetry

          let currentError = e

          current = await retry({ times: MAX_ALLOWED_RETRY_TIMES }, async (exit) => {
            retryTimes += 1

            if (retryTimes > MAX_ALLOWED_RETRY_TIMES) {
              throw exit(new Error(
                `Exceeded maximum retry attempts (${MAX_ALLOWED_RETRY_TIMES}) for event source. Possible infinite retry loop detected. Please review the retry logic.`,
                { cause: currentError },
              ))
            }

            const reconnected = await (async () => {
              try {
                return await reconnect({
                  lastRetry,
                  lastEventId,
                  retryTimes,
                  error: currentError,
                })
              }
              catch (e) {
                currentError = e

                throw e
              }
            })()

            if (!reconnected) {
              throw exit(currentError)
            }

            return reconnected
          })
        }
      }
    }
    finally {
      updateEventIteratorStatus(state, 'closed')

      await current.return?.()
    }
  })()

  registerEventIteratorState(iterator, state)

  return iterator
}
