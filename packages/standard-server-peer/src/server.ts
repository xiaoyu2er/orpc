import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload, RawMessage } from './codec'
import { ConsumableAsyncIdQueue, isAsyncIteratorObject, PullableAsyncIdQueue } from '@orpc/shared'
import { decodeRequestMessage, encodeResponseMessage, isEventIteratorHeaders, MessageType } from './codec'
import { sendEventIterator, toEventIterator } from './event-iterator'
import { toAbortSignal } from './signal'

export class ServerPeer {
  private readonly serverResponseQueue: ConsumableAsyncIdQueue<StandardResponse>
  private readonly serverEventIteratorQueue: ConsumableAsyncIdQueue<EventIteratorPayload>
  private readonly serverSignalQueue: ConsumableAsyncIdQueue<void>

  private readonly clientEventIteratorQueue = new PullableAsyncIdQueue<EventIteratorPayload>()
  private readonly clientSignalQueue = new PullableAsyncIdQueue<void>()

  constructor(
    send: (message: RawMessage) => void,
  ) {
    this.serverResponseQueue = new ConsumableAsyncIdQueue((id, response) => {
      encodeResponseMessage(id, MessageType.RESPONSE, response)
        .then(async (raw) => {
          send(raw)

          if (isAsyncIteratorObject(response.body)) {
            await sendEventIterator(this.serverEventIteratorQueue, id, response.body, {
              onComplete: () => {
                this.close(id)
              },
            })
          }
          else {
            this.close(id)
          }
        })
        .catch((err) => {
          this.close(id, err)
        })
    })

    this.serverEventIteratorQueue = new ConsumableAsyncIdQueue((id, payload) => {
      encodeResponseMessage(id, MessageType.EVENT_ITERATOR, payload)
        .then(send)
        .catch((err) => {
          this.close(id, err)
        })
    })

    this.serverSignalQueue = new ConsumableAsyncIdQueue((id, payload) => {
      encodeResponseMessage(id, MessageType.ABORT_SIGNAL, payload)
        .then(send)
        .catch((err) => {
          this.close(id, err)
        })
    })
  }

  async message(raw: RawMessage): Promise<[id: number, StandardRequest | undefined]> {
    const [id, type, payload] = await decodeRequestMessage(raw)

    if (type === MessageType.ABORT_SIGNAL) {
      if (this.clientSignalQueue.isOpen(id)) {
        this.clientSignalQueue.push(id, payload)
      }

      return [id, undefined]
    }

    if (type === MessageType.EVENT_ITERATOR) {
      if (this.clientEventIteratorQueue.isOpen(id)) {
        this.clientEventIteratorQueue.push(id, payload)
      }

      return [id, undefined]
    }

    this.open(id)

    const clientSignal = toAbortSignal(this.clientSignalQueue, id)

    clientSignal.addEventListener('abort', () => {
      this.close(id, clientSignal.reason)
    }, { once: true })

    const request: StandardRequest = {
      ...payload,
      signal: clientSignal,
      body: isEventIteratorHeaders(payload.headers)
        ? toEventIterator(this.clientEventIteratorQueue, id, {
            onComplete: (reason) => {
              if (reason !== 'next') {
                this.serverSignalQueue.push(id)
              }
            },
          })
        : payload.body,
    }

    return [id, request]
  }

  async response(id: number, response: StandardResponse): Promise<void> {
    if (this.serverResponseQueue.isOpen(id)) {
      this.serverResponseQueue.push(id, response)
    }
  }

  open(id: number): void {
    this.serverSignalQueue.open(id)
    this.serverEventIteratorQueue.open(id)
    this.serverResponseQueue.open(id)

    this.clientEventIteratorQueue.open(id)
    this.clientSignalQueue.open(id)
  }

  close(id?: number, reason?: any): void {
    if (id !== undefined) {
      this.serverResponseQueue.close(id)
      this.serverEventIteratorQueue.close(id)
      this.serverResponseQueue.close(id)

      this.clientEventIteratorQueue.close(id, reason)
      this.clientSignalQueue.close(id, reason)
    }
    else {
      this.serverResponseQueue.closeAll()
      this.serverEventIteratorQueue.closeAll()
      this.serverResponseQueue.closeAll()

      this.clientEventIteratorQueue.closeAll()
      this.clientSignalQueue.closeAll()
    }
  }
}
