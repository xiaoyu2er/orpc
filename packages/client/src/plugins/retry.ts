import type { Value } from '@orpc/shared'
import type { StandardLinkOptions } from '../adapters/standard'
import type { ClientContext } from '../types'
import type { ClientPlugin } from './base'
import { isAsyncIteratorObject, value } from '@orpc/shared'
import { getEventMeta } from '@orpc/standard-server'

export interface RetryPluginAttemptOptions {
  eventIteratorLastRetry: number | undefined
  eventIteratorLastEventId: string | undefined
  attemptIndex: number
  error: unknown
}

export interface RetryPluginContext {
  /**
   * Maximum retry attempts for **consecutive failures** before throwing
   *
   * @default 0
   */
  retry?: number

  /**
   * Delay (in ms) before retrying.
   *
   * @default (o) => o.eventIteratorLastRetry ?? 2000
   */
  retryDelay?: Value<number, [options: RetryPluginAttemptOptions]>

  /**
   * Determine should retry or not.
   *
   * @default true
   */
  shouldRetry?: Value<boolean, [options: RetryPluginAttemptOptions]>

  /**
   * The hook called when retrying, and return the unsubscribe function.
   */
  onRetry?: (options: RetryPluginAttemptOptions) => undefined | (() => void)
}

export class RetryPluginInvalidEventIteratorRetryResponse extends Error { }

export class RetryPlugin<T extends ClientContext & RetryPluginContext> implements ClientPlugin<T> {
  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []

    options.interceptors.push(async (interceptorOptions) => {
      const maxAttempts = interceptorOptions.options.context.retry ?? 0
      const retryDelay = interceptorOptions.options.context.retryDelay ?? (o => o.eventIteratorLastRetry ?? 2000)
      const shouldRetry = interceptorOptions.options.context.shouldRetry ?? true
      const onRetry = interceptorOptions.options.context.onRetry

      if (maxAttempts <= 0) {
        return interceptorOptions.next()
      }

      let lastEventId = interceptorOptions.options.lastEventId
      let lastRetry: undefined | number

      const main = async () => {
        let attemptIndex = 0
        let unsubscribe: undefined | (() => void)

        while (true) {
          try {
            const newClientOptions = { ...interceptorOptions.options, lastEventId }

            const output = await interceptorOptions.next({
              ...interceptorOptions,
              options: newClientOptions,
            })

            unsubscribe?.()

            return output
          }
          catch (error) {
            if (attemptIndex >= maxAttempts || !interceptorOptions.options.signal?.aborted) {
              throw error
            }

            const attemptOptions: RetryPluginAttemptOptions = {
              attemptIndex,
              error,
              eventIteratorLastEventId: lastEventId,
              eventIteratorLastRetry: lastRetry,
            }

            const shouldRetryBool = await value(shouldRetry, attemptOptions)
            if (!shouldRetryBool) {
              throw error
            }

            unsubscribe = onRetry?.(attemptOptions)

            const retryDelayMs = await value(retryDelay, attemptOptions)
            await new Promise(resolve => setTimeout(resolve, retryDelayMs))

            attemptIndex++
          }
        }
      }

      const output = await main()

      if (!isAsyncIteratorObject(output)) {
        return output
      }

      return (async function* () {
        let current = output

        try {
          while (true) {
            try {
              const item = await current.next()

              const meta = getEventMeta(item.value)
              lastEventId = meta?.id ?? lastEventId
              lastRetry = meta?.retry ?? lastRetry

              if (item.done) {
                return item.value
              }

              yield item.value
            }
            catch (error) {
              const meta = getEventMeta(error)
              lastEventId = meta?.id ?? lastEventId
              lastRetry = meta?.retry ?? lastRetry

              const maybeEventIterator = await main()

              if (!isAsyncIteratorObject(maybeEventIterator)) {
                throw new RetryPluginInvalidEventIteratorRetryResponse(
                  'RetryPlugin: Invalid Event Iterator retry response',
                )
              }

              current = maybeEventIterator
            }
          }
        }
        finally {
          current.return?.()
        }
      })()
    })
  }
}
