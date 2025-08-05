import type { AsyncIdQueueCloseOptions } from '@orpc/shared'
import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload } from './codec'
import type { EncodedMessage, EncodedMessageSendFn } from './types'
import { AsyncIdQueue, asyncIteratorWithSpan, clone, getGlobalOtelConfig, isAsyncIteratorObject, runWithSpan, SequentialIdGenerator, setSpanError } from '@orpc/shared'
import { isEventIteratorHeaders } from '@orpc/standard-server'
import { decodeResponseMessage, encodeRequestMessage, MessageType } from './codec'
import { resolveEventIterator, toEventIterator } from './event-iterator'

export interface ClientPeerCloseOptions extends AsyncIdQueueCloseOptions {
  /**
   * Should abort or not?
   *
   * @default true
   */
  abort?: boolean
}

export class ClientPeer {
  private readonly idGenerator = new SequentialIdGenerator()

  private readonly responseQueue = new AsyncIdQueue<StandardResponse>()
  private readonly serverEventIteratorQueue = new AsyncIdQueue<EventIteratorPayload>()
  private readonly serverControllers = new Map<string, AbortController>()

  private readonly send: (...args: Parameters<typeof encodeRequestMessage>) => Promise<void>

  constructor(
    send: EncodedMessageSendFn,
  ) {
    this.send = async (id, ...rest) => encodeRequestMessage(id, ...rest).then(async (raw) => {
      // only send message if still open
      if (this.serverControllers.has(id)) {
        await send(raw)
      }
    })
  }

  get length(): number {
    return (
      +this.responseQueue.length
      + this.serverEventIteratorQueue.length
      + this.serverControllers.size
    ) / 3
  }

  open(id: string): AbortController {
    this.serverEventIteratorQueue.open(id)
    this.responseQueue.open(id)
    const controller = new AbortController()
    this.serverControllers.set(id, controller)
    return controller
  }

  async request(request: StandardRequest): Promise<StandardResponse> {
    const signal = request.signal

    return runWithSpan(
      { name: 'send_peer_request', signal },
      async (span) => {
        /**
         * [Semantic conventions for HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
         */
        span?.setAttribute('http.request.method', request.method)
        span?.setAttribute('url.full', request.url.toString())

        if (signal?.aborted) {
          span?.addEvent('abort', { reason: String(signal.reason) })
          throw signal.reason
        }

        signal?.addEventListener('abort', () => {
          span?.addEvent('abort', { reason: String(signal.reason) })
        })

        const id = this.idGenerator.generate()
        const serverController = this.open(id)

        let carrierRequest: typeof request = request
        const otelConfig = getGlobalOtelConfig()

        if (otelConfig) {
          carrierRequest = { ...carrierRequest, headers: clone(request.headers) }
          otelConfig.propagation.inject(otelConfig.context.active(), carrierRequest.headers)
        }

        return await new Promise((resolve, reject) => {
          this.send(id, MessageType.REQUEST, carrierRequest)
            .then(async () => {
              if (signal?.aborted) {
                await this.send(id, MessageType.ABORT_SIGNAL, undefined)
                this.close({ id, reason: signal.reason })
                return
              }

              signal?.addEventListener('abort', async () => {
                await this.send(id, MessageType.ABORT_SIGNAL, undefined)
                this.close({ id, reason: signal.reason })
              }, { once: true })

              if (isAsyncIteratorObject(request.body)) {
                const iterator = request.body

                await runWithSpan(
                  { name: 'stream_event_iterator', signal },
                  async (span) => {
                    let sending = false
                    try {
                      await resolveEventIterator(iterator, async (payload) => {
                        if (serverController.signal.aborted) {
                          return 'abort'
                        }

                        sending = true
                        await this.send(id, MessageType.EVENT_ITERATOR, payload)
                        sending = false

                        span?.addEvent(payload.event)

                        return 'next'
                      })
                    }
                    catch (e) {
                      /**
                       * Only rethrow errors that occur while sending.
                       * For other errors, we can still wait for the server response,
                       * so we don't want to close the id prematurely.
                       */
                      if (sending) {
                        throw e
                      }

                      /**
                       * Send an error event if an unexpected error occurs (not error event).
                       * Without this, the server event iterator may hang waiting for the next event.
                       * Unlike HTTP/fetch streams (throw on unexpected end of steam),
                       * we must manually signal errors in this custom implementation (long-live connection).
                       */
                      await this.send(id, MessageType.EVENT_ITERATOR, { event: 'error', data: undefined })
                      setSpanError(span, e, { signal })
                    }
                  },
                )
              }
            })
            .catch((err) => {
              this.close({ id, reason: err })
              reject(err)
            })

          this.responseQueue.pull(id)
            .then((response) => {
              if (isEventIteratorHeaders(response.headers)) {
                const iterator = asyncIteratorWithSpan(
                  { name: 'consume_event_iterator_stream', signal },
                  toEventIterator(this.serverEventIteratorQueue, id, async (reason) => {
                    try {
                      if (reason !== 'next') {
                        await this.send(id, MessageType.ABORT_SIGNAL, undefined)
                      }
                    }
                    finally {
                      this.close({ id })
                    }
                  }),
                )

                resolve({
                  ...response,
                  body: iterator,
                })
              }
              else {
                resolve(response)
                this.close({ id })
              }
            })
            .catch((err) => {
              this.close({ id, reason: err })
              reject(err)
            })
        })
      },
    )
  }

  async message(raw: EncodedMessage): Promise<void> {
    const [id, type, payload] = await decodeResponseMessage(raw)

    if (!this.responseQueue.isOpen(id)) {
      return
    }

    if (type === MessageType.ABORT_SIGNAL) {
      this.serverControllers.get(id)?.abort()
      return
    }

    if (type === MessageType.EVENT_ITERATOR) {
      this.serverEventIteratorQueue.push(id, payload)
      return
    }

    this.responseQueue.push(id, payload)
  }

  close(options: AsyncIdQueueCloseOptions = {}): void {
    if (options.id !== undefined) {
      this.serverControllers.get(options.id)?.abort(options.reason)
      this.serverControllers.delete(options.id)
    }
    else {
      this.serverControllers.forEach(c => c.abort(options.reason))
      this.serverControllers.clear()
    }

    this.responseQueue.close(options)
    this.serverEventIteratorQueue.close(options)
  }
}
