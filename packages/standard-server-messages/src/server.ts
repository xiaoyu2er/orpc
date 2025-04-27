import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload, RawMessage } from './codec'
import { isAsyncIteratorObject, toArray } from '@orpc/shared'
import { decodeRequestMessage, encodeResponseMessage, MessageType } from './codec'
import { sendEventIterator, toEventIterator } from './event-iterator'
import { ConsumableAsyncIdQueue, PullableAsyncIdQueue } from './queue'
import { toAbortSignal } from './signal'

export class MessageServer {
  private readonly serverSignalQueue: ConsumableAsyncIdQueue<void>
  private readonly serverEventIteratorQueue: ConsumableAsyncIdQueue<EventIteratorPayload>
  private readonly serverResponseQueue: ConsumableAsyncIdQueue<StandardResponse>

  private readonly clientSignalQueue = new PullableAsyncIdQueue<void>()
  private readonly clientEventIteratorQueue = new PullableAsyncIdQueue<EventIteratorPayload>()
  private readonly clientRequestQueue = new PullableAsyncIdQueue<StandardRequest>()

  constructor(
    send: (message: RawMessage) => void,
  ) {
    this.serverSignalQueue = new ConsumableAsyncIdQueue((id, payload) => {
      encodeResponseMessage(id, MessageType.ABORT_SIGNAL, payload)
        .then(send)
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

    this.serverResponseQueue = new ConsumableAsyncIdQueue((id, response) => {
      encodeResponseMessage(id, MessageType.RESPONSE, response)
        .then(send)
        .catch((err) => {
          this.close(id, err)
        })
    })
  }

  async message(raw: RawMessage): Promise<[id: number, StandardRequest | undefined]> {
    const [id, type, payload] = await decodeRequestMessage(raw)

    if (type === MessageType.ABORT_SIGNAL) {
      this.clientSignalQueue.push(id, payload)
      return [id, undefined]
    }

    if (type === MessageType.EVENT_ITERATOR) {
      this.clientEventIteratorQueue.push(id, payload)
      return [id, undefined]
    }

    this.serverSignalQueue.open(id)
    this.serverEventIteratorQueue.open(id)
    this.serverResponseQueue.open(id)

    this.clientRequestQueue.open(id)
    this.clientEventIteratorQueue.open(id)
    this.clientSignalQueue.open(id)

    const isBlob = toArray(payload.headers['content-disposition'])[0] !== undefined
    const isStreaming = toArray(payload.headers['content-type'])[0]?.startsWith('text/event-stream')

    const request: StandardRequest = {
      ...payload,
      signal: toAbortSignal(this.clientSignalQueue, id),
      body: isStreaming && !isBlob
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
    this.serverResponseQueue.push(id, response)

    if (isAsyncIteratorObject(response.body)) {
      await sendEventIterator(this.serverEventIteratorQueue, id, response.body, {
        onComplete: () => {
          // this.close(id)
        },
      })
    }
    else {
      // this.close(id)
    }
  }

  close(id?: number, reason?: any): void {
    if (id) {
      this.serverResponseQueue.close(id)
      this.serverEventIteratorQueue.close(id)
      this.serverResponseQueue.close(id)

      this.clientRequestQueue.close(id, reason)
      this.clientEventIteratorQueue.close(id, reason)
      this.clientSignalQueue.close(id, reason)
    }
    else {
      this.serverResponseQueue.closeAll()
      this.serverEventIteratorQueue.closeAll()
      this.serverResponseQueue.closeAll()

      this.clientRequestQueue.closeAll()
      this.clientEventIteratorQueue.closeAll()
      this.clientSignalQueue.closeAll()
    }
  }
}
