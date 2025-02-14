import { ORPCError } from '@orpc/contract'
import { getEventSourceRetry, getTrackId } from '@orpc/server-standard'
import { createListenableEventSourceIterator, setEventSourceIteratorStatus } from './event-source-hooks'

export interface EventSourceIteratorReconnectOptions {
  lastRetry: number | undefined
  lastEventId: string | undefined
  retryTimes: number
  error: unknown
}

export function createReconnectableEventSourceIterator<T, TReturn>(
  initial: AsyncIteratorObject<T, TReturn, void>,
  reconnect: (options: EventSourceIteratorReconnectOptions) => Promise<AsyncIteratorObject<T, TReturn, void> | null>,
  initialLastEventId: string | undefined,
): AsyncIteratorObject<T, TReturn, void> {
  let current = initial

  let lastRetry: number | undefined
  let retryTimes = 0
  let lastEventId: string | undefined = initialLastEventId

  const iterator: AsyncIteratorObject<any, any, void> = createListenableEventSourceIterator({
    next: async (value) => {
      try {
        setEventSourceIteratorStatus(iterator, 'connected')

        const result = await current.next(value)
        
        retryTimes = 0

        lastRetry = getEventSourceRetry(result.value) ?? lastRetry
        lastEventId = getTrackId(result.value)

        if (result.done) {
          setEventSourceIteratorStatus(iterator, 'closed')
        }

        return result
      }
      catch (error) {
        setEventSourceIteratorStatus(iterator, 'reconnecting')

        lastRetry = getEventSourceRetry(error) ?? lastRetry
        lastEventId = error instanceof ORPCError ? getTrackId(error) : lastEventId
        retryTimes += 1

        const newIterator = await reconnect({
          lastRetry,
          lastEventId,
          error,
          retryTimes,
        })

        if (!newIterator) {
          setEventSourceIteratorStatus(iterator, 'closed')
          throw error
        }

        current = newIterator

        return iterator.next(value)
      }
    },
    return: async (value) => {
      setEventSourceIteratorStatus(iterator, 'closed')
      await current.return?.(value)

      return { done: true, value }
    },
    throw: async (e) => {
      setEventSourceIteratorStatus(iterator, 'closed')
      await current.throw?.(e)

      throw e
    },
    [Symbol.asyncIterator]() {
      return iterator
    },
  })

  return iterator
}
