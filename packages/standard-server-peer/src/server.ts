import type { AsyncIdQueueCloseOptions } from '@orpc/shared'
import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload } from './codec'
import type { EncodedMessage, EncodedMessageSendFn } from './types'
import { AsyncIdQueue, isAsyncIteratorObject } from '@orpc/shared'
import { decodeRequestMessage, encodeResponseMessage, isEventIteratorHeaders, MessageType } from './codec'
import { resolveEventIterator, toEventIterator } from './event-iterator'

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
  private readonly clientControllers = new Map<number, AbortController>()

  constructor(
    private readonly send: EncodedMessageSendFn,
  ) {
  }

  get length(): number {
    return (
      this.clientEventIteratorQueue.length
      + this.clientControllers.size
    ) / 2
  }

  open(id: number): AbortController {
    this.clientEventIteratorQueue.open(id)
    const controller = new AbortController()
    this.clientControllers.set(id, controller)
    return controller
  }

  async message(raw: EncodedMessage): Promise<[id: number, StandardRequest | undefined]> {
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

    const request: StandardRequest = {
      ...payload,
      signal: clientController.signal,
      body: isEventIteratorHeaders(payload.headers)
        ? toEventIterator(this.clientEventIteratorQueue, id, async (reason) => {
            if (reason !== 'next') {
              await encodeResponseMessage(id, MessageType.ABORT_SIGNAL, undefined)
                .then(this.send)
            }
          })
        : payload.body,
    }

    return [id, request]
  }

  async response(id: number, response: StandardResponse): Promise<void> {
    const signal = this.clientControllers.get(id)?.signal

    if (!signal || signal.aborted) {
      return
    }

    await encodeResponseMessage(id, MessageType.RESPONSE, response)
      .then(this.send)
      .then(async () => {
        if (isAsyncIteratorObject(response.body)) {
          await resolveEventIterator(response.body, async (payload) => {
            if (signal.aborted) {
              return 'abort'
            }

            await encodeResponseMessage(id, MessageType.EVENT_ITERATOR, payload)
              .then(this.send)

            return 'next'
          })
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
        this.clientControllers.forEach(c => c.abort())
      }

      this.clientControllers.clear()
    }
    else {
      if (abort) {
        this.clientControllers.get(options.id)?.abort()
      }

      this.clientControllers.delete(options.id)
    }

    this.clientEventIteratorQueue.close(options)
  }
}
