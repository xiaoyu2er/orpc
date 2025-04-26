export abstract class AsyncIdQueue<T> {
  private readonly openIds = new Set<number>()

  abstract push(id: number, item: T): void

  open(id: number): void {
    this.openIds.add(id)
  }

  close(id: number): void {
    this.openIds.delete(id)
  }

  closeAll(): void {
    this.openIds.forEach(id => this.close(id))
  }

  isOpen(id: number): boolean {
    return this.openIds.has(id)
  }
}

export interface AsyncIdQueuePullOptions {
  signal?: AbortSignal
  timeout?: number
}

export class PullableAsyncIdQueue<T> extends AsyncIdQueue<T> {
  private readonly items = new Map<number, T[]>()
  private readonly pendingPulls = new Map<number, (readonly [resolve: (item: T) => void, reject: (err: Error) => void])[]>()

  push(id: number, item: T): void {
    if (!this.isOpen(id)) {
      throw new Error(`[PullableAsyncIdQueue] Cannot push to an not opened item[${id}]`)
    }

    const pending = this.pendingPulls.get(id)

    if (pending?.length) {
      pending.shift()![0](item)

      if (pending.length === 0) {
        this.pendingPulls.delete(id)
      }
    }
    else {
      const items = this.items.get(id)

      if (items) {
        items.push(item)
      }
      else {
        this.items.set(id, [item])
      }
    }
  }

  async pull(id: number, { signal, timeout }: AsyncIdQueuePullOptions = {}): Promise<T> {
    if (signal?.aborted) {
      throw signal.reason
    }

    if (!this.isOpen(id)) {
      throw new Error(`[AsyncIdQueue] Cannot pull from an not opened item[${id}]`)
    }

    const items = this.items.get(id)

    if (items?.length) {
      const item = items.shift()!

      if (items.length === 0) {
        this.items.delete(id)
      }

      return item
    }

    return new Promise<T>((resolve, reject) => {
      const abort = () => {
        reject(signal!.reason)
      }

      signal?.addEventListener('abort', abort, { once: true })

      const timeoutId = timeout
        ? setTimeout(() => { reject(new Error('Timeout')) }, timeout)
        : undefined

      const waitingPulls = this.pendingPulls.get(id)

      const pending = [
        (item: T) => {
          clearTimeout(timeoutId)
          signal?.removeEventListener('abort', abort)
          resolve(item)
        },
        (err: Error) => {
          clearTimeout(timeoutId)
          signal?.removeEventListener('abort', abort)
          reject(err)
        },
      ] as const

      if (waitingPulls) {
        waitingPulls.push(pending)
      }
      else {
        this.pendingPulls.set(id, [pending])
      }
    })
  }

  override close(id: number, reason?: any): void {
    this.items.delete(id)

    this.pendingPulls.get(id)?.forEach(([,reject]) => {
      reject(reason ?? new Error(`[AsyncIdQueue] Item[${id}] was closed while waiting for pull.`))
    })

    this.pendingPulls.delete(id)

    super.close(id)
  }
}

export class ConsumableAsyncIdQueue<T> extends AsyncIdQueue<T> {
  constructor(
    private readonly consume: (id: number, item: T) => void,
  ) {
    super()
  }

  push(id: number, item: T): void {
    if (!this.isOpen(id)) {
      throw new Error(`[ConsumableAsyncIdQueue] Cannot push to an not opened item[${id}]`)
    }

    this.consume(id, item)
  }
}
