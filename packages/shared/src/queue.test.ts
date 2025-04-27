import { ConsumableAsyncIdQueue, PullableAsyncIdQueue } from './queue'

describe('pullableAsyncIdQueue', () => {
  let queue: PullableAsyncIdQueue<string>
  const queueId1 = 1
  const queueId2 = 2

  beforeEach(() => {
    queue = new PullableAsyncIdQueue<string>()
  })

  it('should require queue to be opened before push', () => {
    expect(() => queue.push(queueId1, 'item1')).toThrow(
      `[AsyncIdQueue] Cannot access queue[${queueId1}] because it is not open.`,
    )
  })

  it('should require queue to be opened before pull', async () => {
    await expect(queue.pull(queueId1)).rejects.toThrow(
      `[AsyncIdQueue] Cannot access queue[${queueId1}] because it is not open.`,
    )
  })

  it('should push and pull items in FIFO order', async () => {
    queue.open(queueId1)
    queue.push(queueId1, 'item1')
    queue.push(queueId1, 'item2')

    expect(await queue.pull(queueId1)).toBe('item1')
    expect(await queue.pull(queueId1)).toBe('item2')
  })

  it('should handle pulls before pushes (async wait)', async () => {
    queue.open(queueId1)
    const pullPromise1 = queue.pull(queueId1)
    const pullPromise2 = queue.pull(queueId1)

    queue.push(queueId1, 'item1')
    expect(await pullPromise1).toBe('item1')

    queue.push(queueId1, 'item2')
    expect(await pullPromise2).toBe('item2')
  })

  it('should isolate items between different queue IDs', async () => {
    queue.open(queueId1)
    queue.open(queueId2)

    queue.push(queueId1, 'itemQ1')
    queue.push(queueId2, 'itemQ2')

    expect(await queue.pull(queueId1)).toBe('itemQ1')
    expect(await queue.pull(queueId2)).toBe('itemQ2')
  })

  it('should close a queue, preventing further pushes/pulls', async () => {
    queue.open(queueId1)
    queue.push(queueId1, 'item1')
    queue.close(queueId1)

    expect(queue.isOpen(queueId1)).toBe(false)
    expect(() => queue.push(queueId1, 'item2')).toThrow(
      `[AsyncIdQueue] Cannot access queue[${queueId1}] because it is not open.`,
    )
    await expect(queue.pull(queueId1)).rejects.toThrow(
      `[AsyncIdQueue] Cannot access queue[${queueId1}] because it is not open.`,
    )
  })

  it('should reject pending pulls when a queue is closed (default reason)', async () => {
    queue.open(queueId1)
    const pullPromise = queue.pull(queueId1)

    queue.close(queueId1)

    await expect(pullPromise).rejects.toThrow(
      `[PullableAsyncIdQueue] Queue[${queueId1}] was closed while waiting for pulling.`,
    )
  })

  it('should reject pending pulls with a custom reason when a queue is closed', async () => {
    queue.open(queueId1)
    const pullPromise = queue.pull(queueId1)
    const customError = new Error('Custom closure reason')

    queue.close(queueId1, customError)

    await expect(pullPromise).rejects.toBe(customError)
  })

  it('should return correct status with isOpen', () => {
    expect(queue.isOpen(queueId1)).toBe(false)
    queue.open(queueId1)
    expect(queue.isOpen(queueId1)).toBe(true)
    queue.close(queueId1)
    expect(queue.isOpen(queueId1)).toBe(false)
  })

  it('assertOpen should throw if queue is not open', () => {
    expect(() => queue.assertOpen(queueId1)).toThrow(
      `[AsyncIdQueue] Cannot access queue[${queueId1}] because it is not open.`,
    )
    queue.open(queueId1)
    expect(() => queue.assertOpen(queueId1)).not.toThrow()
  })

  it('closeAll should close all open queues and reject pending pulls', async () => {
    queue.open(queueId1)
    queue.open(queueId2)

    const pullPromise1 = queue.pull(queueId1)
    const pullPromise2 = queue.pull(queueId2)
    queue.push(queueId2, 'preCloseItem')

    expect(await pullPromise2).toBe('preCloseItem')

    queue.closeAll()

    expect(queue.isOpen(queueId1)).toBe(false)
    expect(queue.isOpen(queueId2)).toBe(false)

    await expect(pullPromise1).rejects.toThrow(
      `[PullableAsyncIdQueue] Queue[${queueId1}] was closed while waiting for pulling.`,
    )

    expect(() => queue.push(queueId1, 'item')).toThrow()
    await expect(queue.pull(queueId1)).rejects.toThrow()
  })
})

describe('consumableAsyncIdQueue', () => {
  const consumeMock = vi.fn()
  let queue: ConsumableAsyncIdQueue<string>
  const queueId1 = 1
  const queueId2 = 2

  beforeEach(() => {
    consumeMock.mockClear()
    queue = new ConsumableAsyncIdQueue<string>(consumeMock)
  })

  it('should require queue to be opened before push', () => {
    expect(() => queue.push(queueId1, 'item1')).toThrow(
      `[AsyncIdQueue] Cannot access queue[${queueId1}] because it is not open.`,
    )
    expect(consumeMock).not.toHaveBeenCalled()
  })

  it('should call the consume function with correct arguments on push', () => {
    queue.open(queueId1)
    queue.push(queueId1, 'item1')

    expect(consumeMock).toHaveBeenCalledOnce()
    expect(consumeMock).toHaveBeenCalledWith(queueId1, 'item1')
  })

  it('should call the consume function for the correct queue ID', () => {
    queue.open(queueId1)
    queue.open(queueId2)

    queue.push(queueId1, 'itemQ1')
    queue.push(queueId2, 'itemQ2')

    expect(consumeMock).toHaveBeenCalledTimes(2)
    expect(consumeMock).toHaveBeenCalledWith(queueId1, 'itemQ1')
    expect(consumeMock).toHaveBeenCalledWith(queueId2, 'itemQ2')
  })

  it('should close a queue, preventing further pushes', () => {
    queue.open(queueId1)
    queue.close(queueId1)

    expect(queue.isOpen(queueId1)).toBe(false)
    expect(() => queue.push(queueId1, 'item2')).toThrow(
      `[AsyncIdQueue] Cannot access queue[${queueId1}] because it is not open.`,
    )
    expect(consumeMock).not.toHaveBeenCalled()
  })

  it('should return correct status with isOpen', () => {
    expect(queue.isOpen(queueId1)).toBe(false)
    queue.open(queueId1)
    expect(queue.isOpen(queueId1)).toBe(true)
    queue.close(queueId1)
    expect(queue.isOpen(queueId1)).toBe(false)
  })

  it('assertOpen should throw if queue is not open', () => {
    expect(() => queue.assertOpen(queueId1)).toThrow(
      `[AsyncIdQueue] Cannot access queue[${queueId1}] because it is not open.`,
    )
    queue.open(queueId1)
    expect(() => queue.assertOpen(queueId1)).not.toThrow()
  })

  it('closeAll should close all open queues', () => {
    queue.open(queueId1)
    queue.open(queueId2)

    queue.closeAll()

    expect(queue.isOpen(queueId1)).toBe(false)
    expect(queue.isOpen(queueId2)).toBe(false)

    expect(() => queue.push(queueId1, 'item')).toThrow()
    expect(() => queue.push(queueId2, 'item')).toThrow()
  })
})
