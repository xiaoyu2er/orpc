import type { AsyncIdQueueCloseOptions } from '@orpc/shared'
import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload } from './codec'
import type { EncodedMessage, EncodedMessageSendFn } from './types'
import { AsyncIdQueue, isAsyncIteratorObject, SequentialIdGenerator } from '@orpc/shared'
import { decodeResponseMessage, encodeRequestMessage, isEventIteratorHeaders, MessageType } from './codec'
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
  private readonly serverControllers = new Map<number, AbortController>()

  constructor(
    private readonly send: EncodedMessageSendFn,
  ) {}

  get length(): number {
    return (
      +this.responseQueue.length
      + this.serverEventIteratorQueue.length
      + this.serverControllers.size
    ) / 3
  }

  open(id: number): AbortController {
    this.serverEventIteratorQueue.open(id)
    this.responseQueue.open(id)
    const controller = new AbortController()
    this.serverControllers.set(id, controller)
    return controller
  }

  async request(request: StandardRequest): Promise<StandardResponse> {
    const signal = request.signal

    if (signal?.aborted) {
      throw signal.reason
    }

    const id = this.idGenerator.generate()

    const serverController = this.open(id)

    signal?.addEventListener('abort', () => {
      this.close({ id, reason: signal.reason })
    }, { once: true })

    return new Promise((resolve, reject) => {
      encodeRequestMessage(id, MessageType.REQUEST, request)
        .then(this.send)
        .then(async () => {
          if (signal?.aborted) {
            await encodeRequestMessage(id, MessageType.ABORT_SIGNAL, undefined)
              .then(this.send)
          }
          else {
            signal?.addEventListener('abort', () => {
              encodeRequestMessage(id, MessageType.ABORT_SIGNAL, undefined)
                .then(this.send)
            }, { once: true })
          }

          if (isAsyncIteratorObject(request.body)) {
            await resolveEventIterator(request.body, async (payload) => {
              if (serverController.signal.aborted) {
                return 'abort'
              }

              await encodeRequestMessage(id, MessageType.EVENT_ITERATOR, payload)
                .then(this.send)

              return 'next'
            })
          }
        })
        .catch((err) => {
          this.close({ id, reason: err })
          reject(err)
        })

      this.responseQueue.pull(id)
        .then(resolve)
        .catch(reject)
    })
  }

  async message(raw: EncodedMessage): Promise<void> {
    const [id, type, payload] = await decodeResponseMessage(raw)

    if (type === MessageType.ABORT_SIGNAL) {
      this.serverControllers.get(id)?.abort()
      return
    }

    if (type === MessageType.EVENT_ITERATOR) {
      if (this.serverEventIteratorQueue.isOpen(id)) {
        this.serverEventIteratorQueue.push(id, payload)
      }

      return
    }

    if (!this.responseQueue.isOpen(id)) {
      return
    }

    if (isEventIteratorHeaders(payload.headers)) {
      this.responseQueue.push(id, {
        ...payload,
        body: toEventIterator(this.serverEventIteratorQueue, id, async (reason) => {
          try {
            if (reason !== 'next') {
              await encodeRequestMessage(id, MessageType.ABORT_SIGNAL, undefined)
                .then(this.send)
            }
          }
          finally {
            this.close({ id })
          }
        }),
      })
    }
    else {
      this.responseQueue.push(id, payload)
      this.close({ id })
    }
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
