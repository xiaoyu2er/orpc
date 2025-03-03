import type { Interceptor, Value } from '@orpc/shared'
import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientLink, ClientOptionsOut } from '../../types'
import type { StandardLinkClient, StandardLinkCodec } from './types'
import { intercept, isAsyncIteratorObject, value } from '@orpc/shared'
import { createAutoRetryEventIterator, type EventIteratorReconnectOptions } from '../../event-iterator'

export class InvalidEventSourceRetryResponse extends Error { }

export interface StandardLinkOptions<T extends ClientContext> {
  /**
   * Maximum number of retry attempts for EventSource errors before throwing.
   *
   * @default 5
   */
  eventSourceMaxNumberOfRetries?: Value<number, [
        reconnectOptions: EventIteratorReconnectOptions,
        options: ClientOptionsOut<T>,
        path: readonly string[],
        input: unknown,
  ]>

  /**
   * Delay (in ms) before retrying an EventSource call.
   *
   * @default (o) => o.lastRetry ?? (1000 * 2 ** o.retryTimes)
   */
  eventSourceRetryDelay?: Value<number, [
    reconnectOptions: EventIteratorReconnectOptions,
    options: ClientOptionsOut<T>,
    path: readonly string[],
    input: unknown,
  ]>

  /**
   * Function to determine if an error is retryable.
   *
   * @default true
   */
  eventSourceRetry?: Value<boolean, [
    reconnectOptions: EventIteratorReconnectOptions,
    options: ClientOptionsOut<T>,
    path: readonly string[],
    input: unknown,
  ]>

  interceptors?: Interceptor<{ path: readonly string[], input: unknown, options: ClientOptionsOut<T> }, unknown, unknown>[]
  clientInterceptors?: Interceptor<{ request: StandardRequest }, StandardLazyResponse, unknown>[]
}

export class StandardLink<T extends ClientContext> implements ClientLink<T> {
  private readonly eventSourceMaxNumberOfRetries: Exclude<StandardLinkOptions<T>['eventSourceMaxNumberOfRetries'], undefined>
  private readonly eventSourceRetryDelay: Exclude<StandardLinkOptions<T>['eventSourceRetryDelay'], undefined>
  private readonly eventSourceRetry: Exclude<StandardLinkOptions<T>['eventSourceRetry'], undefined>

  private readonly interceptors: Exclude<StandardLinkOptions<T>['interceptors'], undefined>
  private readonly clientInterceptors: Exclude<StandardLinkOptions<T>['clientInterceptors'], undefined>

  constructor(
    public readonly codec: StandardLinkCodec,
    public readonly sender: StandardLinkClient,
    options: StandardLinkOptions<T>,
  ) {
    this.eventSourceMaxNumberOfRetries = options.eventSourceMaxNumberOfRetries ?? 5
    this.eventSourceRetryDelay = options.eventSourceRetryDelay ?? (o => o.lastRetry ?? (1000 * 2 ** o.retryTimes))
    this.eventSourceRetry = options.eventSourceRetry ?? true

    this.interceptors = options.interceptors ?? []
    this.clientInterceptors = options.clientInterceptors ?? []
  }

  call(path: readonly string[], input: unknown, options: ClientOptionsOut<T>): Promise<unknown> {
    return intercept(this.interceptors, { path, input, options }, async ({ path, input, options }) => {
      const output = await this.#call(path, input, options)

      if (!isAsyncIteratorObject(output)) {
        return output
      }

      return createAutoRetryEventIterator(output, async (reconnectOptions) => {
        const eventSourceMaxNumberOfRetries = await value(this.eventSourceMaxNumberOfRetries, reconnectOptions, options, path, input)

        if (options.signal?.aborted || reconnectOptions.retryTimes > eventSourceMaxNumberOfRetries) {
          return null
        }

        if (!(await value(this.eventSourceRetry, reconnectOptions, options, path, input))) {
          return null
        }

        const delay = await value(this.eventSourceRetryDelay, reconnectOptions, options, path, input)

        await new Promise(resolve => setTimeout(resolve, delay))

        const updatedOptions = { ...options, lastEventId: reconnectOptions.lastEventId }
        const maybeIterator = await this.#call(path, input, updatedOptions)

        if (!isAsyncIteratorObject(maybeIterator)) {
          throw new InvalidEventSourceRetryResponse('Invalid EventSource retry response')
        }

        return maybeIterator
      }, options.lastEventId)
    })
  }

  async #call(path: readonly string[], input: unknown, options: ClientOptionsOut<T>): Promise<unknown> {
    const request = this.codec.encode(path, input, options)

    const response = await intercept(this.clientInterceptors, { request }, ({ request }) => this.sender.call(request))

    const output = this.codec.decode(response)

    return output
  }
}
