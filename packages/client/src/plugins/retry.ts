import type { Value } from '@orpc/shared'
import type { StandardLinkOptions } from '../adapters/standard'
import type { ClientContext, ClientOptionsOut } from '../types'
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
  retryDelay?: Value<number, [
    attemptOptions: RetryPluginAttemptOptions,
    clientOptions: ClientOptionsOut<RetryPluginContext>,
    path: readonly string[],
    input: unknown,
  ]>

  /**
   * Determine should retry or not.
   *
   * @default true
   */
  shouldRetry?: Value<boolean, [
    attemptOptions: RetryPluginAttemptOptions,
    clientOptions: ClientOptionsOut<RetryPluginContext>,
    path: readonly string[],
    input: unknown,
  ]>

  /**
   * The hook called when retrying, and return the unsubscribe function.
   */
  onRetry?: (
    options: RetryPluginAttemptOptions,
    clientOptions: ClientOptionsOut<RetryPluginContext>,
    path: readonly string[],
    input: unknown
  ) => undefined | (() => void)
}

export class RetryPluginInvalidEventIteratorRetryResponse extends Error { }

export interface RetryPluginOptions {
  default?: RetryPluginContext
}

export class RetryPlugin<T extends ClientContext & RetryPluginContext> implements ClientPlugin<T> {
  private readonly defaultRetry: Exclude<RetryPluginContext['retry'], undefined>
  private readonly defaultRetryDelay: Exclude<RetryPluginContext['retryDelay'], undefined>
  private readonly defaultShouldRetry: Exclude<RetryPluginContext['shouldRetry'], undefined>
  private readonly defaultOnRetry: RetryPluginContext['onRetry']

  constructor(options: RetryPluginOptions = {}) {
    this.defaultRetry = options.default?.retry ?? 0
    this.defaultRetryDelay = options.default?.retryDelay ?? (o => o.eventIteratorLastRetry ?? 2000)
    this.defaultShouldRetry = options.default?.shouldRetry ?? true
    this.defaultOnRetry = options.default?.onRetry
  }

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []

    options.interceptors.push(async (interceptorOptions) => {
      const maxAttempts = interceptorOptions.options.context.retry ?? this.defaultRetry
      const retryDelay = interceptorOptions.options.context.retryDelay ?? this.defaultRetryDelay
      const shouldRetry = interceptorOptions.options.context.shouldRetry ?? this.defaultShouldRetry
      const onRetry = interceptorOptions.options.context.onRetry ?? this.defaultOnRetry

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

            const shouldRetryBool = await value(
              shouldRetry,
              attemptOptions,
              interceptorOptions.options,
              interceptorOptions.path,
              interceptorOptions.input,
            )
            if (!shouldRetryBool) {
              throw error
            }

            unsubscribe = onRetry?.(
              attemptOptions,
              interceptorOptions.options,
              interceptorOptions.path,
              interceptorOptions.input,
            )

            const retryDelayMs = await value(
              retryDelay,
              attemptOptions,
              interceptorOptions.options,
              interceptorOptions.path,
              interceptorOptions.input,
            )
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
                  'RetryPlugin: Expected an Event Iterator, got a non-Event Iterator',
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
