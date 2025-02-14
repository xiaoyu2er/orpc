import { ORPCError } from '@orpc/contract'
import { track } from '@orpc/server-standard'
import { createReconnectableEventSourceIterator } from './event-source'
import { onEventSourceIteratorStatusChange } from './event-source-hooks'

describe('createReconnectableEventSourceIterator', () => {
  it('on success', async () => {
    const reconnect = vi.fn()

    const iterator = createReconnectableEventSourceIterator((async function* () {
      yield 1
      yield 2
      yield 3
      return 4
    })(), reconnect, 'id')

    const listener = vi.fn()
    onEventSourceIteratorStatusChange(iterator, listener)

    expect(await iterator.next()).toEqual({ done: false, value: 1 })
    expect(await iterator.next()).toEqual({ done: false, value: 2 })
    expect(await iterator.next()).toEqual({ done: false, value: 3 })
    expect(await iterator.next()).toEqual({ done: true, value: 4 })

    expect(reconnect).toHaveBeenCalledTimes(0)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenNthCalledWith(1, 'closed')
  })

  it('on error but cannot reconnect', async () => {
    const error = new Error('test')

    const reconnect = vi.fn().mockResolvedValue(null)

    const iterator = createReconnectableEventSourceIterator((async function* () {
      throw error
    })(), reconnect, 'id')

    const listener = vi.fn()
    onEventSourceIteratorStatusChange(iterator, listener)

    await expect(iterator.next()).rejects.toThrow(error)

    expect(reconnect).toHaveBeenCalledTimes(1)
    expect(reconnect).toHaveBeenCalledWith({
      lastEventId: 'id',
      lastRetry: undefined,
      retryTimes: 1,
      error,
    })

    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenNthCalledWith(1, 'reconnecting')
    expect(listener).toHaveBeenNthCalledWith(2, 'closed')
  })

  it('on error but can reconnect', async () => {
    const error = track(new ORPCError('test'), '123')

    const reconnect = vi.fn().mockResolvedValue((async function*() {
      yield 4
      yield 5
      yield 6
      return 7
    })())

    const iterator = createReconnectableEventSourceIterator((async function* () {
      yield 1
      yield 2
      yield 3
      throw error
    })(), reconnect, 'id')

    const listener = vi.fn()
    onEventSourceIteratorStatusChange(iterator, listener)

    expect(await iterator.next()).toEqual({ done: false, value: 1 })
    expect(await iterator.next()).toEqual({ done: false, value: 2 })
    expect(await iterator.next()).toEqual({ done: false, value: 3 })
    expect(await iterator.next()).toEqual({ done: false, value: 4 })
    expect(await iterator.next()).toEqual({ done: false, value: 5 })
    expect(await iterator.next()).toEqual({ done: false, value: 6 })
    expect(await iterator.next()).toEqual({ done: true, value: 7 })

    expect(reconnect).toHaveBeenCalledTimes(1)
    expect(reconnect).toHaveBeenCalledWith({
      lastEventId: '123',
      lastRetry: undefined,
      retryTimes: 1,
      error,
    })

    expect(listener).toHaveBeenCalledTimes(3)
    expect(listener).toHaveBeenNthCalledWith(1, 'reconnecting')
    expect(listener).toHaveBeenNthCalledWith(2, 'connected')
    expect(listener).toHaveBeenNthCalledWith(3, 'closed')
  })

  it('.throw', async () => {
    const error = new Error('test')
    const reconnect = vi.fn()
    let catchError: unknown

    const iterator = createReconnectableEventSourceIterator((async function* () {
      try {
        yield 1
        yield 2
      }
      catch (e) {
        catchError = e
      }
    })(), reconnect, 'id')

    const listener = vi.fn()
    onEventSourceIteratorStatusChange(iterator, listener)

    await expect(iterator.next()).resolves.toEqual({ done: false, value: 1 })
    await expect(iterator.throw?.(error)).rejects.toThrow(error)
    expect(catchError).toBe(error)
  })

  it('.return', async () => {
    const reconnect = vi.fn()
    let finished = false

    const iterator = createReconnectableEventSourceIterator((async function* () {
      try {
        yield 1
        yield 2
      }
      finally {
        finished = true
      }
    })(), reconnect, 'id')

    const listener = vi.fn()
    onEventSourceIteratorStatusChange(iterator, listener)

    expect(await iterator.next()).toEqual({ done: false, value: 1 })
    expect(await iterator.return?.(123 as any)).toEqual({ done: true, value: 123 })
    expect(finished).toBe(true)
  })

  it('iterable', async () => {
    const reconnect = vi.fn()

    const iterator = createReconnectableEventSourceIterator((async function* () {
      yield 1
      yield 2
      yield 3
      return 4
    })(), reconnect, 'id')

    const val: any[] = []

    for await (const v of iterator) {
      val.push(v)
    }

    expect(val).toEqual([1, 2, 3])
  })
})
