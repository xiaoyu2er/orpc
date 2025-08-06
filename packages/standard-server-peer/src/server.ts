import type { AsyncIdQueueCloseOptions } from '@orpc/shared'
import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload } from './codec'
import type { EncodedMessage, EncodedMessageSendFn } from './types'
import { AsyncIdQueue, getGlobalOtelConfig, isAsyncIteratorObject, runWithSpan, setSpanError } from '@orpc/shared'
import { experimental_HibernationEventIterator, isEventIteratorHeaders } from '@orpc/standard-server'
import { decodeRequestMessage, encodeResponseMessage, MessageType } from './codec'
import { resolveEventIterator, toEventIterator } from './event-iterator'

export interface ServerPeerHandleRequestFn {
  (request: StandardRequest): Promise<StandardResponse>
}

export interface ServerPeerCloseOptions extends AsyncIdQueueCloseOptions {
  /**
   * Should abort or not?
   *
   * @default true
   */
  abort?: boolean
}

export class ServerPeer {
  private readonly clientEventIteratorQueue = new AsyncIdQueue<EventIteratorPayload>()
  private readonly clientControllers = new Map<string, AbortController>()

  private readonly send: (...args: Parameters<typeof encodeResponseMessage>) => Promise<void>

  constructor(
    send: EncodedMessageSendFn,
  ) {
    this.send = (id, ...rest) => encodeResponseMessage(id, ...rest).then(async (raw) => {
      // only send message if still open
      if (this.clientControllers.has(id)) {
        await send(raw)
      }
    })
  }

  get length(): number {
    return (
      this.clientEventIteratorQueue.length
      + this.clientControllers.size
    ) / 2
  }

  open(id: string): AbortController {
    this.clientEventIteratorQueue.open(id)
    const controller = new AbortController()
    this.clientControllers.set(id, controller)
    return controller
  }

  /**
   * @todo This method will return Promise<void> in the next major version.
   */
  async message(
    raw: EncodedMessage,
    handleRequest?: ServerPeerHandleRequestFn,
  ): Promise<[id: string, StandardRequest | undefined]> {
    const [id, type, payload] = await decodeRequestMessage(raw)

    if (type === MessageType.ABORT_SIGNAL) {
      this.close({ id })
      return [id, undefined]
    }

    if (type === MessageType.EVENT_ITERATOR) {
      if (this.clientEventIteratorQueue.isOpen(id)) {
        this.clientEventIteratorQueue.push(id, payload)
      }
      return [id, undefined]
    }

    const clientController = this.open(id)
    const signal = clientController.signal

    const request: StandardRequest = {
      ...payload,
      signal,
      body: isEventIteratorHeaders(payload.headers)
        ? toEventIterator(
            this.clientEventIteratorQueue,
            id,
            async (reason) => {
              if (reason !== 'next') {
                await this.send(id, MessageType.ABORT_SIGNAL, undefined)
              }
            },
            { signal },
          )
        : payload.body,
    }

    if (handleRequest) {
      let context
      const otelConfig = getGlobalOtelConfig()
      if (otelConfig) {
        context = otelConfig.propagation.extract(otelConfig.context.active(), request.headers)
      }

      await runWithSpan(
        { name: 'receive_peer_request', signal, context },
        async () => {
          const response = await runWithSpan(
            { name: 'handle_request', signal },
            () => handleRequest(request),
          )

          await runWithSpan(
            { name: 'send_peer_response', signal },
            () => this.response(id, response),
          )
        },
      )
    }

    return [id, request]
  }

  /**
   * @deprecated Please pass the `handleRequest` (second arg) function to the `message` method instead.
   */
  async response(id: string, response: StandardResponse): Promise<void> {
    const signal = this.clientControllers.get(id)?.signal

    // only send message if still open and not aborted
    if (!signal || signal.aborted) {
      return
    }

    await this.send(id, MessageType.RESPONSE, response)
      .then(async () => {
        if (!signal.aborted && isAsyncIteratorObject(response.body)) {
          if (response.body instanceof experimental_HibernationEventIterator) {
            response.body.hibernationCallback?.(id)
          }
          else {
            const iterator = response.body

            await runWithSpan(
              { name: 'stream_event_iterator', signal },
              async (span) => {
                let sending = false

                try {
                  await resolveEventIterator(iterator, async (payload) => {
                    if (signal.aborted) {
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
                   * Without this, the client event iterator may hang waiting for the next event.
                   * Unlike HTTP/fetch streams (throw on unexpected end of steam),
                   * we must manually signal errors in this custom implementation (long-live connection).
                   */
                  await this.send(id, MessageType.EVENT_ITERATOR, { event: 'error', data: undefined })
                  setSpanError(span, e, { signal })
                }
              },
            )
          }
        }

        this.close({ id, abort: false })
      })
      .catch((reason) => {
        this.close({ id, reason, abort: false })
        throw reason
      })
  }

  close({ abort = true, ...options }: ServerPeerCloseOptions = {}): void {
    if (options.id === undefined) {
      if (abort) {
        this.clientControllers.forEach(c => c.abort(options.reason))
      }

      this.clientControllers.clear()
    }
    else {
      if (abort) {
        this.clientControllers.get(options.id)?.abort(options.reason)
      }

      this.clientControllers.delete(options.id)
    }

    this.clientEventIteratorQueue.close(options)
  }
}
