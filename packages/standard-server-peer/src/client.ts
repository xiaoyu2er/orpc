import type { AsyncIdQueueCloseOptions } from '@orpc/shared'
import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload } from './codec'
import type { EncodedMessage, EncodedMessageSendFn } from './types'
import { AsyncIdQueue, clone, getGlobalOtelConfig, isAsyncIteratorObject, runWithSpan, SequentialIdGenerator, setSpanError } from '@orpc/shared'
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
  private readonly cleanupFns = new Map<string, (() => void)[]>()

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
      + this.cleanupFns.size
    ) / 4
  }

  open(id: string): AbortController {
    this.serverEventIteratorQueue.open(id)
    this.responseQueue.open(id)
    const controller = new AbortController()
    this.serverControllers.set(id, controller)
    this.cleanupFns.set(id, [])
    return controller
  }

  async request(request: StandardRequest): Promise<StandardResponse> {
    const signal = request.signal

    return runWithSpan(
      { name: 'send_peer_request', signal },
      async (span) => {
        if (signal?.aborted) {
          span?.addEvent('abort', { reason: String(signal.reason) })
          throw signal.reason
        }

        const id = this.idGenerator.generate()
        const serverController = this.open(id)

        try {
          const otelConfig = getGlobalOtelConfig()

          if (otelConfig) {
            request = { ...request, headers: clone(request.headers) }
            otelConfig.propagation.inject(otelConfig.context.active(), request.headers)
          }

          /**
           * We must ensure the request is sent before send any additional messages,
           * such as event iterator messages, signal messages, etc.
           * Otherwise, the server may not recognize them as part of the request.
           */
          await this.send(id, MessageType.REQUEST, request)

          if (signal?.aborted) {
            await this.send(id, MessageType.ABORT_SIGNAL, undefined)
            throw signal.reason
          }

          let abortListener: () => void
          signal?.addEventListener('abort', abortListener = async () => {
            await this.send(id, MessageType.ABORT_SIGNAL, undefined)
            this.close({ id, reason: signal.reason })
          }, { once: true })
          /**
           * Make sure to remove the abort listener when the request/response is closed.
           * Since a signal can be reused for multiple requests, if each request
           * adds listeners without removing them, it can lead to excessive memory usage
           * until the signal is garbage collected.
           */
          this.cleanupFns.get(id)?.push(() => {
            signal?.removeEventListener('abort', abortListener)
          })

          if (isAsyncIteratorObject(request.body)) {
            const iterator = request.body

            /**
             * Do not await here; we don't want it to block response processing.
             * Errors should be handled in the unhandledRejection channel.
             * Even if sending event iterator to the server fails,
             * the server can still send back a response.
             */
            runWithSpan(
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
                   * Because error while sending event iterator
                   * we can't any better than just throw it.
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

          const response = await this.responseQueue.pull(id)

          if (isEventIteratorHeaders(response.headers)) {
            const iterator = toEventIterator(
              this.serverEventIteratorQueue,
              id,
              async (reason) => {
                try {
                  if (reason !== 'next') {
                    await this.send(id, MessageType.ABORT_SIGNAL, undefined)
                  }
                }
                finally {
                  this.close({ id })
                }
              },
              { signal },
            )

            return {
              ...response,
              body: iterator,
            }
          }

          this.close({ id })
          return response
        }
        catch (err) {
          this.close({ id, reason: err })
          throw err
        }
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
      this.cleanupFns.get(options.id)?.forEach(fn => fn())
      this.cleanupFns.delete(options.id)
    }
    else {
      this.serverControllers.forEach(c => c.abort(options.reason))
      this.serverControllers.clear()
      this.cleanupFns.forEach(fns => fns.forEach(fn => fn()))
      this.cleanupFns.clear()
    }

    this.responseQueue.close(options)
    this.serverEventIteratorQueue.close(options)
  }
}
