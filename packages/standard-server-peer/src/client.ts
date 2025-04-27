import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload, RawMessage } from './codec'
import { isAsyncIteratorObject, toArray } from '@orpc/shared'
import { decodeResponseMessage, encodeRequestMessage, MessageType } from './codec'
import { sendEventIterator, toEventIterator } from './event-iterator'
import { SequentialIdGenerator } from './id'
import { ConsumableAsyncIdQueue, PullableAsyncIdQueue } from './queue'
import { toAbortSignal } from './signal'

export class ClientPeer {
  private readonly idGenerator = new SequentialIdGenerator()

  private readonly clientSignalQueue: ConsumableAsyncIdQueue<void>
  private readonly clientEventIteratorQueue: ConsumableAsyncIdQueue<EventIteratorPayload>
  private readonly clientRequestQueue: ConsumableAsyncIdQueue<Omit<StandardRequest, 'signal'>>

  private readonly serverSignalQueue = new PullableAsyncIdQueue<void>()
  private readonly serverEventIterator = new PullableAsyncIdQueue<EventIteratorPayload>()
  private readonly serverResponseQueue = new PullableAsyncIdQueue<StandardResponse>()

  constructor(
    send: (message: RawMessage) => void,
  ) {
    this.clientSignalQueue = new ConsumableAsyncIdQueue((id, payload) => {
      encodeRequestMessage(id, MessageType.ABORT_SIGNAL, payload)
        .then(send)
        .catch((err) => {
          this.close(id, err)
        })
    })

    this.clientEventIteratorQueue = new ConsumableAsyncIdQueue((id, payload) => {
      encodeRequestMessage(id, MessageType.EVENT_ITERATOR, payload)
        .then(send)
        .catch((err) => {
          this.close(id, err)
        })
    })

    this.clientRequestQueue = new ConsumableAsyncIdQueue((id, request) => {
      encodeRequestMessage(id, MessageType.REQUEST, request)
        .then(send)
        .catch((err) => {
          this.close(id, err)
        })
    })
  }

  async request({ signal, ...request }: StandardRequest): Promise<StandardResponse> {
    if (signal?.aborted) {
      throw signal.reason
    }

    const id = this.idGenerator.generate()

    this.clientSignalQueue.open(id)
    this.clientEventIteratorQueue.open(id)
    this.clientRequestQueue.open(id)

    this.serverSignalQueue.open(id)
    this.serverEventIterator.open(id)
    this.serverResponseQueue.open(id)

    signal?.addEventListener('abort', () => {
      if (this.serverSignalQueue.isOpen(id)) {
        this.clientSignalQueue.push(id)
      }

      this.close(id, signal.reason)
    }, { once: true })

    this.clientRequestQueue.push(id, request)
    if (isAsyncIteratorObject(request.body)) {
      sendEventIterator(this.clientEventIteratorQueue, id, request.body)
    }

    const serverSignal = toAbortSignal(this.serverSignalQueue, id)
    serverSignal.addEventListener('abort', () => {
      this.serverEventIterator.close(id, serverSignal.reason)
    }, { once: true })

    return new Promise((resolve, reject) => {
      this.serverResponseQueue.pull(id)
        .then(resolve)
        .catch(reject)
    })
  }

  async message(raw: RawMessage): Promise<void> {
    const [id, type, payload] = await decodeResponseMessage(raw)

    if (type === MessageType.EVENT_ITERATOR) {
      this.serverEventIterator.push(id, payload)
      return
    }

    if (type === MessageType.ABORT_SIGNAL) {
      this.serverSignalQueue.push(id, payload)
      return
    }

    const isBlob = toArray(payload.headers['content-disposition'])[0] !== undefined
    const isStreaming = toArray(payload.headers['content-type'])[0]?.startsWith('text/event-stream')

    if (isStreaming && !isBlob) {
      this.serverResponseQueue.push(id, {
        ...payload,
        body: toEventIterator(this.serverEventIterator, id, {
          onComplete: (reason) => {
            if (reason !== 'next') {
              this.clientSignalQueue.push(id)
            }

            this.close(id)
          },
        }),
      })
    }
    else {
      this.serverResponseQueue.push(id, payload)
      this.close(id)
    }
  }

  close(id?: number, reason?: any): void {
    if (id !== undefined) {
      this.clientRequestQueue.close(id)
      this.clientEventIteratorQueue.close(id)
      this.clientSignalQueue.close(id)

      this.serverResponseQueue.close(id, reason)
      this.serverEventIterator.close(id, reason)
      this.serverResponseQueue.close(id, reason)
    }
    else {
      this.clientRequestQueue.closeAll()
      this.clientEventIteratorQueue.closeAll()
      this.clientSignalQueue.closeAll()

      this.serverResponseQueue.closeAll()
      this.serverEventIterator.closeAll()
      this.serverResponseQueue.closeAll()
    }
  }
}
