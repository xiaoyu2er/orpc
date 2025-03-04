import type { Interceptor, Value } from '@orpc/shared'
import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientLink, ClientOptionsOut } from '../../types'
import type { StandardLinkClient, StandardLinkCodec } from './types'
import { intercept, isAsyncIteratorObject, value } from '@orpc/shared'
import { createAutoRetryEventIterator, type EventIteratorReconnectOptions } from '../../event-iterator'

export class InvalidEventIteratorRetryResponse extends Error { }

export interface StandardLinkOptions<T extends ClientContext> {
  /**
   * Maximum number of retry attempts for event iterator errors before throwing.
   *
   * @default 5
   */
  eventIteratorMaxRetries?: Value<number, [
        reconnectOptions: EventIteratorReconnectOptions,
        options: ClientOptionsOut<T>,
        path: readonly string[],
        input: unknown,
  ]>

  /**
   * Delay (in ms) before retrying an event iterator call.
   *
   * @default (o) => o.lastRetry ?? (1000 * 2 ** o.retryTimes)
   */
  eventIteratorRetryDelay?: Value<number, [
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
  eventIteratorShouldRetry?: Value<boolean, [
    reconnectOptions: EventIteratorReconnectOptions,
    options: ClientOptionsOut<T>,
    path: readonly string[],
    input: unknown,
  ]>

  interceptors?: Interceptor<{ path: readonly string[], input: unknown, options: ClientOptionsOut<T> }, unknown, unknown>[]
  clientInterceptors?: Interceptor<{ request: StandardRequest }, StandardLazyResponse, unknown>[]
}

export class StandardLink<T extends ClientContext> implements ClientLink<T> {
  private readonly eventIteratorMaxRetries: Exclude<StandardLinkOptions<T>['eventIteratorMaxRetries'], undefined>
  private readonly eventIteratorRetryDelay: Exclude<StandardLinkOptions<T>['eventIteratorRetryDelay'], undefined>
  private readonly eventIteratorShouldRetry: Exclude<StandardLinkOptions<T>['eventIteratorShouldRetry'], undefined>

  private readonly interceptors: Exclude<StandardLinkOptions<T>['interceptors'], undefined>
  private readonly clientInterceptors: Exclude<StandardLinkOptions<T>['clientInterceptors'], undefined>

  constructor(
    public readonly codec: StandardLinkCodec<T>,
    public readonly sender: StandardLinkClient<T>,
    options?: StandardLinkOptions<T>,
  ) {
    this.eventIteratorMaxRetries = options?.eventIteratorMaxRetries ?? 5
    this.eventIteratorRetryDelay = options?.eventIteratorRetryDelay ?? (o => o.lastRetry ?? (1000 * 2 ** o.retryTimes))
    this.eventIteratorShouldRetry = options?.eventIteratorShouldRetry ?? true

    this.interceptors = options?.interceptors ?? []
    this.clientInterceptors = options?.clientInterceptors ?? []
  }

  call(path: readonly string[], input: unknown, options: ClientOptionsOut<T>): Promise<unknown> {
    return intercept(this.interceptors, { path, input, options }, async ({ path, input, options }) => {
      const output = await this.#call(path, input, options)

      if (!isAsyncIteratorObject(output)) {
        return output
      }

      return createAutoRetryEventIterator(output, async (reconnectOptions) => {
        const maxRetries = await value(this.eventIteratorMaxRetries, reconnectOptions, options, path, input)

        if (options.signal?.aborted || reconnectOptions.retryTimes > maxRetries) {
          return null
        }

        const shouldRetry = await value(this.eventIteratorShouldRetry, reconnectOptions, options, path, input)

        if (!shouldRetry) {
          return null
        }

        const retryDelay = await value(this.eventIteratorRetryDelay, reconnectOptions, options, path, input)

        await new Promise(resolve => setTimeout(resolve, retryDelay))

        const updatedOptions = { ...options, lastEventId: reconnectOptions.lastEventId }
        const maybeIterator = await this.#call(path, input, updatedOptions)

        if (!isAsyncIteratorObject(maybeIterator)) {
          throw new InvalidEventIteratorRetryResponse('Invalid EventSource retry response')
        }

        return maybeIterator
      }, options.lastEventId)
    })
  }

  async #call(path: readonly string[], input: unknown, options: ClientOptionsOut<T>): Promise<unknown> {
    const request = await this.codec.encode(path, input, options)

    const response = await intercept(
      this.clientInterceptors,
      { request },
      ({ request }) => this.sender.call(request, options, path, input),
    )

    const output = await this.codec.decode(response, options, path, input)

    return output
  }
}
