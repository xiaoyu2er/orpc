import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload, RawMessage } from './codec'
import { isAsyncIteratorObject, SequentialIdGenerator } from '@orpc/shared'
import { ConsumableAsyncIdQueue, PullableAsyncIdQueue } from '../../shared/src/queue'
import { decodeResponseMessage, encodeRequestMessage, isEventIteratorHeaders, MessageType } from './codec'
import { sendEventIterator, toEventIterator } from './event-iterator'
import { toAbortSignal } from './signal'

export class ClientPeer {
  private readonly idGenerator = new SequentialIdGenerator()

  private readonly clientRequestQueue: ConsumableAsyncIdQueue<StandardRequest>
  private readonly clientEventIteratorQueue: ConsumableAsyncIdQueue<EventIteratorPayload>
  private readonly clientSignalQueue: ConsumableAsyncIdQueue<void>

  private readonly serverResponseQueue = new PullableAsyncIdQueue<StandardResponse>()
  private readonly serverEventIterator = new PullableAsyncIdQueue<EventIteratorPayload>()
  private readonly serverSignalQueue = new PullableAsyncIdQueue<void>()

  constructor(
    send: (message: RawMessage) => void,
  ) {
    this.clientRequestQueue = new ConsumableAsyncIdQueue((id, { signal, ...request }) => {
      encodeRequestMessage(id, MessageType.REQUEST, request)
        .then((raw) => {
          send(raw)

          if (signal) {
            if (signal.aborted) {
              this.clientSignalQueue.push(id)
              this.close(id, signal.reason)
            }

            signal.addEventListener('abort', () => {
              this.clientSignalQueue.push(id)
              this.close(id, signal.reason)
            }, { once: true })
          }

          if (isAsyncIteratorObject(request.body)) {
            sendEventIterator(this.clientEventIteratorQueue, id, request.body)

            const serverSignal = toAbortSignal(this.serverSignalQueue, id)
            serverSignal.addEventListener('abort', () => {
              this.clientEventIteratorQueue.close(id)
            }, { once: true })
          }
        })
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

    this.clientSignalQueue = new ConsumableAsyncIdQueue((id, payload) => {
      encodeRequestMessage(id, MessageType.ABORT_SIGNAL, payload)
        .then(send)
        .catch((err) => {
          this.close(id, err)
        })
    })
  }

  async request(request: StandardRequest): Promise<StandardResponse> {
    const signal = request.signal

    if (signal?.aborted) {
      throw signal.reason
    }

    const id = this.idGenerator.generate()

    this.open(id)

    this.clientRequestQueue.push(id, request)

    return new Promise((resolve, reject) => {
      this.serverResponseQueue.pull(id)
        .then(resolve)
        .catch(reject)
    })
  }

  async message(raw: RawMessage): Promise<void> {
    const [id, type, payload] = await decodeResponseMessage(raw)

    if (type === MessageType.EVENT_ITERATOR) {
      if (this.serverEventIterator.isOpen(id)) {
        this.serverEventIterator.push(id, payload)
      }

      return
    }

    if (type === MessageType.ABORT_SIGNAL) {
      if (this.serverSignalQueue.isOpen(id)) {
        this.serverSignalQueue.push(id, payload)
      }

      return
    }

    if (isEventIteratorHeaders(payload.headers)) {
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

  open(id: number): void {
    this.clientSignalQueue.open(id)
    this.clientEventIteratorQueue.open(id)
    this.clientRequestQueue.open(id)

    this.serverSignalQueue.open(id)
    this.serverEventIterator.open(id)
    this.serverResponseQueue.open(id)
  }

  close(id?: number, reason?: any): void {
    if (id !== undefined) {
      this.clientRequestQueue.close(id)
      this.clientEventIteratorQueue.close(id)
      this.clientSignalQueue.close(id)

      this.serverResponseQueue.close(id, reason)
      this.serverEventIterator.close(id, reason)
      this.serverSignalQueue.close(id, reason)
    }
    else {
      this.clientRequestQueue.closeAll()
      this.clientEventIteratorQueue.closeAll()
      this.clientSignalQueue.closeAll()

      this.serverResponseQueue.closeAll()
      this.serverEventIterator.closeAll()
      this.serverSignalQueue.closeAll()
    }
  }

  get length(): number {
    return (
      this.clientRequestQueue.length
      + this.clientEventIteratorQueue.length
      + this.clientSignalQueue.length
      + this.serverResponseQueue.length
      + this.serverEventIterator.length
      + this.serverSignalQueue.length
    ) / 6
  }
}
