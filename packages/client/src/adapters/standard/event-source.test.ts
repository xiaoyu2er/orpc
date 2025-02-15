import { setEventSourceMeta } from '@orpc/server-standard'
import { createAutoRetryEventSourceIterator } from './event-source'

describe('createAutoRetryEventSourceIterator', () => {
  it('on success', async () => {
    const reconnect = vi.fn()
    const iterator = createAutoRetryEventSourceIterator((async function* () {
      yield 1
      yield 2
      yield 3
      return 4
    })(), reconnect, 'initial-id')

    expect(await iterator.next()).toEqual({ done: false, value: 1 })
    expect(await iterator.next()).toEqual({ done: false, value: 2 })
    expect(await iterator.next()).toEqual({ done: false, value: 3 })
    expect(await iterator.next()).toEqual({ done: true, value: 4 })
    expect(reconnect).toBeCalledTimes(0)
  })

  it('on error', async () => {
    const reconnect = vi.fn().mockResolvedValueOnce(null)
    const error = new Error('bad')
    const iterator = createAutoRetryEventSourceIterator((async function* () {
      yield 1
      yield 2
      yield 3
      throw error
    })(), reconnect, 'initial-id')

    expect(await iterator.next()).toEqual({ done: false, value: 1 })
    expect(await iterator.next()).toEqual({ done: false, value: 2 })
    expect(await iterator.next()).toEqual({ done: false, value: 3 })
    await expect(iterator.next()).rejects.toThrow('bad')
    expect(reconnect).toBeCalledTimes(1)
    expect(reconnect).toBeCalledWith({
      lastEventId: 'initial-id',
      lastRetry: undefined,
      retryTimes: 1,
      error,
    })
  })

  it('on error with meta', async () => {
    const reconnect = vi.fn().mockResolvedValueOnce(null)
    const error = setEventSourceMeta(new Error('bad'), { id: 'meta-id' })
    const iterator = createAutoRetryEventSourceIterator((async function* () {
      yield 1
      yield 2
      yield setEventSourceMeta({ order: 3 }, { retry: 1000 })
      throw error
    })(), reconnect, 'initial-id')

    expect(await iterator.next()).toEqual({ done: false, value: 1 })
    expect(await iterator.next()).toEqual({ done: false, value: 2 })
    expect(await iterator.next()).toEqual({ done: false, value: { order: 3 } })
    await expect(iterator.next()).rejects.toThrow('bad')
    expect(reconnect).toBeCalledTimes(1)
    expect(reconnect).toBeCalledWith({
      lastEventId: 'meta-id',
      lastRetry: 1000,
      retryTimes: 1,
      error,
    })
  })

  it('can retry multiple time', async () => {
    let times = 0
    const reconnect = vi.fn(async function* () {
      times++
      if (times < 2) {
        throw new Error('bad2')
      }
      yield 4
      yield 5
      return 6
    }) as any

    const error = setEventSourceMeta(new Error('bad'), { id: 'meta-id' })
    const iterator = createAutoRetryEventSourceIterator((async function* () {
      yield 1
      yield 2
      yield setEventSourceMeta({ order: 3 }, { retry: 1000 })
      throw error
    })(), reconnect, 'initial-id')

    expect(await iterator.next()).toEqual({ done: false, value: 1 })
    expect(await iterator.next()).toEqual({ done: false, value: 2 })
    expect(await iterator.next()).toEqual({ done: false, value: { order: 3 } })
    expect(await iterator.next()).toEqual({ done: false, value: 4 })
    expect(await iterator.next()).toEqual({ done: false, value: 5 })
    expect(await iterator.next()).toEqual({ done: true, value: 6 })

    expect(reconnect).toBeCalledTimes(2)
    expect(reconnect).toHaveBeenNthCalledWith(1, {
      lastEventId: 'meta-id',
      lastRetry: 1000,
      retryTimes: 1,
      error,
    })

    expect(reconnect).toHaveBeenNthCalledWith(2, {
      lastEventId: 'meta-id',
      lastRetry: 1000,
      retryTimes: 2,
      error: new Error('bad2'),
    })
  })

  it('can detach infinite retry loop', async () => {
    const reconnect = vi.fn(async function* () {
      throw new Error('bad2')
    }) as any

    const error = setEventSourceMeta(new Error('bad'), { id: 'meta-id' })
    const iterator = createAutoRetryEventSourceIterator((async function* () {
      yield 1
      yield 2
      yield setEventSourceMeta({ order: 3 }, { retry: 1000 })
      throw error
    })(), reconnect, 'initial-id')

    expect(await iterator.next()).toEqual({ done: false, value: 1 })
    expect(await iterator.next()).toEqual({ done: false, value: 2 })
    expect(await iterator.next()).toEqual({ done: false, value: { order: 3 } })
    await expect(iterator.next()).rejects.toThrow('Exceeded maximum retry attempts (99) for event source. Possible infinite retry loop detected. Please review the retry logic.')

    expect(reconnect).toBeCalledTimes(99)
    expect(reconnect).toHaveBeenNthCalledWith(1, {
      lastEventId: 'meta-id',
      lastRetry: 1000,
      retryTimes: 1,
      error,
    })

    expect(reconnect).toHaveBeenNthCalledWith(2, {
      lastEventId: 'meta-id',
      lastRetry: 1000,
      retryTimes: 2,
      error: new Error('bad2'),
    })
  })
})
