import type { Value } from '@orpc/shared'
import type { StandardLinkOptions } from '../adapters/standard'
import type { ClientContext, ClientOptionsOut } from '../types'
import type { ClientPlugin } from './base'
import { isAsyncIteratorObject, value } from '@orpc/shared'
import { getEventMeta } from '@orpc/standard-server'

export interface ClientRetryPluginAttemptOptions {
  eventIteratorLastRetry: number | undefined
  eventIteratorLastEventId: string | undefined
  attemptIndex: number
  error: unknown
}

export interface ClientRetryPluginContext {
  /**
   * Maximum retry attempts before throwing
   * Use `Number.POSITIVE_INFINITY` for infinite retries (e.g., when handling Server-Sent Events).
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
    attemptOptions: ClientRetryPluginAttemptOptions,
    clientOptions: ClientOptionsOut<ClientRetryPluginContext>,
    path: readonly string[],
    input: unknown,
  ]>

  /**
   * Determine should retry or not.
   *
   * @default true
   */
  shouldRetry?: Value<boolean, [
    attemptOptions: ClientRetryPluginAttemptOptions,
    clientOptions: ClientOptionsOut<ClientRetryPluginContext>,
    path: readonly string[],
    input: unknown,
  ]>

  /**
   * The hook called when retrying, and return the unsubscribe function.
   */
  onRetry?: (
    options: ClientRetryPluginAttemptOptions,
    clientOptions: ClientOptionsOut<ClientRetryPluginContext>,
    path: readonly string[],
    input: unknown
  ) => void | (() => void)
}

export class ClientRetryPluginInvalidEventIteratorRetryResponse extends Error { }

export interface ClientRetryPluginOptions {
  default?: ClientRetryPluginContext
}

export class ClientRetryPlugin<T extends ClientContext & ClientRetryPluginContext> implements ClientPlugin<T> {
  private readonly defaultRetry: Exclude<ClientRetryPluginContext['retry'], undefined>
  private readonly defaultRetryDelay: Exclude<ClientRetryPluginContext['retryDelay'], undefined>
  private readonly defaultShouldRetry: Exclude<ClientRetryPluginContext['shouldRetry'], undefined>
  private readonly defaultOnRetry: ClientRetryPluginContext['onRetry']

  constructor(options: ClientRetryPluginOptions = {}) {
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

      let eventIteratorLastEventId = interceptorOptions.options.lastEventId
      let eventIteratorLastRetry: undefined | number
      let unsubscribe: void | (() => void)
      let attemptIndex = 0

      const next = async (initial?: { error: unknown }) => {
        let current = initial

        while (true) {
          if (current) {
            if (attemptIndex >= maxAttempts) {
              throw current.error
            }

            const attemptOptions: ClientRetryPluginAttemptOptions = {
              attemptIndex,
              error: current.error,
              eventIteratorLastEventId,
              eventIteratorLastRetry,
            }

            const shouldRetryBool = await value(
              shouldRetry,
              attemptOptions,
              interceptorOptions.options,
              interceptorOptions.path,
              interceptorOptions.input,
            )

            if (!shouldRetryBool) {
              throw current.error
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

          try {
            const newClientOptions = { ...interceptorOptions.options, lastEventId: eventIteratorLastEventId }

            const output = await interceptorOptions.next({
              ...interceptorOptions,
              options: newClientOptions,
            })

            return output
          }
          catch (error) {
            if (interceptorOptions.options.signal?.aborted === true) {
              throw error
            }

            current = { error }
          }
          finally {
            unsubscribe?.()
            unsubscribe = undefined
          }
        }
      }

      const output = await next()

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
              eventIteratorLastEventId = meta?.id ?? eventIteratorLastEventId
              eventIteratorLastRetry = meta?.retry ?? eventIteratorLastRetry

              if (item.done) {
                return item.value
              }

              yield item.value
            }
            catch (error) {
              const meta = getEventMeta(error)
              eventIteratorLastEventId = meta?.id ?? eventIteratorLastEventId
              eventIteratorLastRetry = meta?.retry ?? eventIteratorLastRetry

              const maybeEventIterator = await next({ error })

              if (!isAsyncIteratorObject(maybeEventIterator)) {
                throw new ClientRetryPluginInvalidEventIteratorRetryResponse(
                  'RetryPlugin: Expected an Event Iterator, got a non-Event Iterator',
                )
              }

              current = maybeEventIterator
            }
          }
        }
        finally {
          await current.return?.()
        }
      })()
    })
  }
}
