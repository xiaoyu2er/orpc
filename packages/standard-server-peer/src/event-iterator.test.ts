import type { EventIteratorPayload } from './codec'
import { ConsumableAsyncIdQueue, PullableAsyncIdQueue } from '@orpc/shared'
import { ErrorEvent, getEventMeta, withEventMeta } from '@orpc/standard-server'
import { sendEventIterator, toEventIterator } from './event-iterator'

describe('toEventIterator', () => {
  it('on success', async () => {
    const queue = new PullableAsyncIdQueue<EventIteratorPayload>()

    queue.open(198)
    queue.open(199)

    queue.push(198, {
      event: 'message',
      data: 'hello',
    })

    queue.push(199, {
      event: 'message',
      data: 'hello2',
    })

    queue.push(198, {
      event: 'message',
      data: { hello3: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    queue.push(198, {
      event: 'done',
      data: { hello4: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })

    const onComplete = vi.fn()
    const iterator = toEventIterator(queue, 198, {
      onComplete,
    })

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(false)
      expect(value.value).toEqual('hello')
      expect(getEventMeta(value.value)).toEqual(undefined)

      return true
    })

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(false)
      expect(value.value).toEqual({ hello3: true })
      expect(getEventMeta(value.value)).toEqual({ id: 'id-1', retry: 2000, comments: [] })
      return true
    })

    expect(onComplete).toHaveBeenCalledTimes(0)

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(true)
      expect(value.value).toEqual({ hello4: true })
      expect(getEventMeta(value.value)).toEqual({ id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      return true
    })

    expect(onComplete).toHaveBeenCalledTimes(1)

    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })
  })

  it('on error', async () => {
    const queue = new PullableAsyncIdQueue<EventIteratorPayload>()

    queue.open(198)
    queue.open(199)

    queue.push(198, {
      event: 'message',
      data: 'hello',
    })

    queue.push(199, {
      event: 'message',
      data: 'hello2',
    })

    queue.push(198, {
      event: 'message',
      data: { hello3: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    queue.push(198, {
      event: 'error',
      data: { hello4: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })

    const onComplete = vi.fn()
    const iterator = toEventIterator(queue, 198, {
      onComplete,
    })

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(false)
      expect(value.value).toEqual('hello')
      expect(getEventMeta(value.value)).toEqual(undefined)

      return true
    })

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(false)
      expect(value.value).toEqual({ hello3: true })
      expect(getEventMeta(value.value)).toEqual({ id: 'id-1', retry: 2000, comments: [] })
      return true
    })

    expect(onComplete).toHaveBeenCalledTimes(0)

    await expect(iterator.next()).rejects.toSatisfy((value) => {
      expect(value).toBeInstanceOf(ErrorEvent)
      expect(value.data).toEqual({ hello4: true })
      expect(getEventMeta(value)).toEqual({ id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      return true
    })

    expect(onComplete).toHaveBeenCalledTimes(1)

    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })
  })
})

describe('sendEventIterator', () => {
  it('on success', async () => {
    const onComplete = vi.fn()
    const consume = vi.fn()

    const queue = new ConsumableAsyncIdQueue<EventIteratorPayload>(consume)

    queue.open(133)

    await sendEventIterator(queue, 133, (async function* () {
      yield 'hello'
      yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
      yield 'hello3'
      return withEventMeta({ hello4: true }, { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
    })(), {
      onComplete,
    })

    expect(onComplete).toHaveBeenCalledTimes(1)

    expect(consume).toHaveBeenCalledTimes(4)
    expect(consume).toHaveBeenNthCalledWith(1, 133, {
      event: 'message',
      data: 'hello',
    })

    expect(consume).toHaveBeenNthCalledWith(2, 133, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    expect(consume).toHaveBeenNthCalledWith(3, 133, {
      event: 'message',
      data: 'hello3',
    })

    expect(consume).toHaveBeenNthCalledWith(4, 133, {
      event: 'done',
      data: { hello4: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })
  })

  it('on ErrorEvent', async () => {
    const onComplete = vi.fn()
    const consume = vi.fn()

    const queue = new ConsumableAsyncIdQueue<EventIteratorPayload>(consume)

    queue.open(133)

    await sendEventIterator(queue, 133, (async function* () {
      yield 'hello'
      yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
      yield 'hello3'
      throw withEventMeta(new ErrorEvent({ data: { hello4: true } }), { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
    })(), {
      onComplete,
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(consume).toHaveBeenCalledTimes(4)
    expect(consume).toHaveBeenNthCalledWith(1, 133, {
      event: 'message',
      data: 'hello',
    })

    expect(consume).toHaveBeenNthCalledWith(2, 133, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    expect(consume).toHaveBeenNthCalledWith(3, 133, {
      event: 'message',
      data: 'hello3',
    })

    expect(consume).toHaveBeenNthCalledWith(4, 133, {
      event: 'error',
      data: { hello4: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })
  })

  it('on unknown error', async () => {
    const onComplete = vi.fn()
    const consume = vi.fn()

    const queue = new ConsumableAsyncIdQueue<EventIteratorPayload>(consume)

    queue.open(133)

    await sendEventIterator(queue, 133, (async function* () {
      yield 'hello'
      yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
      yield 'hello3'
      throw withEventMeta(new Error('hi'), { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
    })(), { onComplete })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(consume).toHaveBeenCalledTimes(4)
    expect(consume).toHaveBeenNthCalledWith(1, 133, {
      event: 'message',
      data: 'hello',
    })

    expect(consume).toHaveBeenNthCalledWith(2, 133, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    expect(consume).toHaveBeenNthCalledWith(3, 133, {
      event: 'message',
      data: 'hello3',
    })

    expect(consume).toHaveBeenNthCalledWith(4, 133, {
      event: 'error',
      data: undefined,
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })
  })

  it('on closes', async () => {
    const onComplete = vi.fn()
    const consume = vi.fn()

    const queue = new ConsumableAsyncIdQueue<EventIteratorPayload>(consume)

    let cleanupCalled = false
    let returnCalled = false

    await sendEventIterator(queue, 133, (async function* () {
      try {
        yield 'hello'
        yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
        yield 'hello3'
        returnCalled = true
        return withEventMeta({ hello4: true }, { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      }
      finally {
        cleanupCalled = true
      }
    })(), { onComplete })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(consume).toHaveBeenCalledTimes(0)
    expect(cleanupCalled).toBe(true)
    expect(returnCalled).toBe(false)
  })

  it('on queue error', async () => {
    const onComplete = vi.fn()
    const consume = vi.fn()
    const error = new Error('hi')
    let time = 0

    const queue = new Proxy(new ConsumableAsyncIdQueue<EventIteratorPayload>(consume), {
      get(target, prop) {
        if (prop === 'push') {
          if (time++ === 1) {
            return () => {
              throw error
            }
          }
        }

        return Reflect.get(target, prop)
      },
    })

    queue.open(133)

    let cleanupCalled = false
    let returnCalled = false
    let throwCalledWith

    await sendEventIterator(queue, 133, (async function* () {
      try {
        yield 'hello'
        yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
        yield 'hello3'
        returnCalled = true
        return withEventMeta({ hello4: true }, { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      }
      catch (err) {
        throwCalledWith = err
        throw withEventMeta(new ErrorEvent({ data: { hello5: true } }), { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      }
      finally {
        cleanupCalled = true
      }
    })(), { onComplete })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(consume).toHaveBeenCalledTimes(2)
    expect(cleanupCalled).toBe(true)
    expect(returnCalled).toBe(false)
    expect(throwCalledWith).toBe(error)

    expect(consume).toHaveBeenNthCalledWith(1, 133, {
      event: 'message',
      data: 'hello',
    })

    expect(consume).toHaveBeenNthCalledWith(2, 133, {
      event: 'error',
      data: { hello5: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })
  })

  it('on queue error with iterator without .throw()', async () => {
    const onComplete = vi.fn()
    const consume = vi.fn()
    const error = withEventMeta(new Error('hi'), { id: 'id-5', retry: 2001, comments: [] })
    let time = 0

    const queue = new Proxy(new ConsumableAsyncIdQueue<EventIteratorPayload>(consume), {
      get(target, prop) {
        if (prop === 'push') {
          if (time++ === 1) {
            return () => {
              throw error
            }
          }
        }

        return Reflect.get(target, prop)
      },
    })

    queue.open(133)

    const iterator = (async function* () {
      yield 'hello'
      yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
      yield 'hello3'
      return withEventMeta({ hello4: true }, { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
    })()

    await sendEventIterator(queue, 133, {
      next: () => iterator.next(),
    }, { onComplete })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(consume).toHaveBeenCalledTimes(2)
    expect(consume).toHaveBeenNthCalledWith(1, 133, {
      event: 'message',
      data: 'hello',
    })

    expect(consume).toHaveBeenNthCalledWith(2, 133, {
      event: 'error',
      data: undefined,
      meta: { id: 'id-5', retry: 2001, comments: [] },
    })
  })
})
