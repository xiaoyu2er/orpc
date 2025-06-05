import { createAsyncIteratorObject } from './iterator'

export interface EventEmitterOptions {
  /**
   * Maximum number of events to buffer for async iterator subscribers.
   *
   * If the buffer exceeds this limit, the oldest event is dropped.
   * This prevents unbounded memory growth if consumers process events slowly.
   *
   * Set to:
   * - `0`: Disable buffering. Events must be consumed before the next one arrives.
   * - `1`: Only keep the latest event. Useful for real-time updates where only the most recent value matters.
   * - `Infinity`: Keep all events. Ensures no data loss, but may lead to high memory usage.
   *
   * @default 100
   */
  maxBufferedEvents?: number
}

export interface EventPublisherSubscribeIteratorOptions extends EventEmitterOptions {
  signal?: AbortSignal
}

export class EventPublisher<T extends Record<PropertyKey, any>> {
  #listenersMap = new Map<keyof T, Set<(payload: any) => void>>()
  #maxBufferedEvents: number

  constructor(options: EventEmitterOptions = {}) {
    this.#maxBufferedEvents = options.maxBufferedEvents ?? 100
  }

  get size(): number {
    return this.#listenersMap.size
  }

  publish<K extends keyof T>(event: K, payload: T[K]): void {
    const listeners = this.#listenersMap.get(event)

    if (!listeners) {
      return
    }

    for (const listener of listeners) {
      listener(payload)
    }
  }

  subscribe<K extends keyof T>(event: K, listener: (payload: T[K]) => void): () => void
  subscribe<K extends keyof T>(event: K, options?: EventPublisherSubscribeIteratorOptions): AsyncGenerator<T[K]> & AsyncIteratorObject<T[K]>
  subscribe<K extends keyof T>(
    event: K,
    listenerOrOptions?: ((payload: T[K]) => void) | EventPublisherSubscribeIteratorOptions,
  ): (() => void) | AsyncGenerator<T[K]> & AsyncIteratorObject<T[K]> {
    if (typeof listenerOrOptions === 'function') {
      let listeners = this.#listenersMap.get(event)

      if (!listeners) {
        this.#listenersMap.set(event, listeners = new Set())
      }

      listeners.add(listenerOrOptions)

      return () => {
        listeners.delete(listenerOrOptions)

        if (listeners.size === 0) {
          this.#listenersMap.delete(event)
        }
      }
    }

    const signal = listenerOrOptions?.signal
    const maxBufferedEvents = listenerOrOptions?.maxBufferedEvents ?? this.#maxBufferedEvents

    const bufferedEvents: T[K][] = []
    const pullResolvers: ((result: IteratorResult<T[K]>) => void)[] = []

    const unsubscribe = this.subscribe(event, (payload) => {
      const resolver = pullResolvers.shift()

      if (resolver) {
        resolver({ done: false, value: payload })
      }
      else {
        bufferedEvents.push(payload)

        if (bufferedEvents.length > maxBufferedEvents) {
          bufferedEvents.shift()
        }
      }
    })

    return createAsyncIteratorObject(async () => {
      if (signal?.aborted) {
        throw signal.reason
      }

      if (bufferedEvents.length > 0) {
        return { done: false, value: bufferedEvents.shift()! }
      }

      return new Promise((resolve, reject) => {
        const abortListener = (event: Event) => {
          reject((event.target as AbortSignal).reason)
        }

        signal?.addEventListener('abort', abortListener, { once: true })

        pullResolvers.push((payload) => {
          resolve(payload)
          signal?.removeEventListener('abort', abortListener)
        })
      })
    }, async () => {
      unsubscribe()
      pullResolvers.forEach(r => r({ done: true, value: undefined }))
      pullResolvers.length = 0
      bufferedEvents.length = 0
    })
  }
}
