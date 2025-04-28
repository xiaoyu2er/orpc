import { PullableAsyncIdQueue } from '@orpc/shared'
import { toAbortSignal } from './signal'

describe('toAbortSignal', () => {
  it('should abort immediately if the queue already contains the target ID', async () => {
    const queue = new PullableAsyncIdQueue<void>()

    queue.open(133)
    queue.push(133)

    const signal = toAbortSignal(queue, 133)

    await new Promise(r => setTimeout(r, 0))

    expect(signal.aborted).toBe(true)
  })

  it('should abort when the target ID is added to the queue after the signal is created', async () => {
    const queue = new PullableAsyncIdQueue<void>()

    queue.open(133)

    const signal = toAbortSignal(queue, 133)

    await new Promise(r => setTimeout(r, 0))
    expect(signal.aborted).toBe(false)

    queue.push(133)

    await new Promise(r => setTimeout(r, 0))
    expect(signal.aborted).toBe(true)
  })

  it('should not abort if the queue is closed for the target ID', async () => {
    const queue = new PullableAsyncIdQueue<void>()

    queue.open(133)

    const signal = toAbortSignal(queue, 133)

    queue.close(133)

    await new Promise(r => setTimeout(r, 0))
    expect(signal.aborted).toBe(false)
  })
})
