import type { EventIteratorState } from './event-iterator-state'
import { getEventMeta, isEventMetaContainer, withEventMeta } from '@orpc/server-standard'
import { retry } from '@orpc/shared'
import { registerEventIteratorState, updateEventIteratorStatus } from './event-iterator-state'

export function mapEventIterator<TYield, TReturn, TNext, TMap = TYield | TReturn>(
  iterator: AsyncIterator<TYield, TReturn, TNext>,
  maps: {
    value: (value: NoInfer<TYield | TReturn>, done: boolean | undefined) => Promise<TMap>
    error: (error: unknown) => Promise<unknown>
  },
): AsyncGenerator<TMap, TMap, TNext> {
  return (async function* () {
    try {
      while (true) {
        const { done, value } = await iterator.next()

        let mappedValue = await maps.value(value, done) as any

        if (mappedValue !== value) {
          const meta = getEventMeta(value)
          if (meta && isEventMetaContainer(mappedValue)) {
            mappedValue = withEventMeta(mappedValue, meta)
          }
        }

        if (done) {
          return mappedValue
        }

        yield mappedValue
      }
    }
    catch (error) {
      let mappedError = await maps.error(error)

      if (mappedError !== error) {
        const meta = getEventMeta(error)
        if (meta && isEventMetaContainer(mappedError)) {
          mappedError = withEventMeta(mappedError, meta)
        }
      }

      throw mappedError
    }
    finally {
      await iterator.return?.()
    }
  })()
}

export interface EventIteratorReconnectOptions {
  lastRetry: number | undefined
  lastEventId: string | undefined
  retryTimes: number
  error: unknown
}

const MAX_ALLOWED_RETRY_TIMES = 99

export function createAutoRetryEventIterator<TYield, TReturn>(
  initial: AsyncIterator<TYield, TReturn, void>,
  reconnect: (options: EventIteratorReconnectOptions) => Promise<AsyncIterator<TYield, TReturn, void> | null>,
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

          const meta = getEventMeta(value)

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

          const meta = getEventMeta(e)
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
