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

  assertOpen(id: number): void {
    if (!this.isOpen(id)) {
      throw new Error(`[AsyncIdQueue] Cannot access queue[${id}] because it is not open.`)
    }
  }

  get length(): number {
    return this.openIds.size
  }
}

export class PullableAsyncIdQueue<T> extends AsyncIdQueue<T> {
  private readonly items = new Map<number, T[]>()
  private readonly pendingPulls = new Map<number, (readonly [resolve: (item: T) => void, reject: (err: Error) => void])[]>()

  push(id: number, item: T): void {
    this.assertOpen(id)

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

  async pull(id: number): Promise<T> {
    this.assertOpen(id)

    const items = this.items.get(id)

    if (items?.length) {
      const item = items.shift()!

      if (items.length === 0) {
        this.items.delete(id)
      }

      return item
    }

    return new Promise<T>((resolve, reject) => {
      const waitingPulls = this.pendingPulls.get(id)

      const pending = [resolve, reject] as const

      if (waitingPulls) {
        waitingPulls.push(pending)
      }
      else {
        this.pendingPulls.set(id, [pending])
      }
    })
  }

  override close(id: number, reason?: any): void {
    const pendingPulls = this.pendingPulls.get(id)

    if (pendingPulls) {
      pendingPulls.forEach(([, reject]) => {
        reject(reason ?? new Error(`[PullableAsyncIdQueue] Queue[${id}] was closed while waiting for pulling.`))
      })

      this.pendingPulls.delete(id)
    }

    super.close(id)
    this.items.delete(id)
  }
}

export class ConsumableAsyncIdQueue<T> extends AsyncIdQueue<T> {
  constructor(
    private readonly consume: (id: number, item: T) => void,
  ) {
    super()
  }

  push(id: number, item: T): void {
    this.assertOpen(id)
    this.consume(id, item)
  }
}
