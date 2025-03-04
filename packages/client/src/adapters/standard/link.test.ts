import { withEventMeta } from '@orpc/standard-server'
import * as EventIteratorModule from '../../event-iterator'
import { InvalidEventIteratorRetryResponse, StandardLink } from './link'

const createAutoRetryEventIteratorSpy = vi.spyOn(EventIteratorModule, 'createAutoRetryEventIterator')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('standardLink', () => {
  const codec = { encode: vi.fn(), decode: vi.fn() }
  const client = { call: vi.fn() }

  it('workflow is correct', async () => {
    const interceptor = vi.fn(({ next }) => next())
    const clientInterceptor = vi.fn(({ next }) => next())

    const link = new StandardLink(codec, client, {
      interceptors: [interceptor],
      clientInterceptors: [clientInterceptor],
    })

    codec.encode.mockReturnValueOnce('__standard_request__')
    client.call.mockResolvedValueOnce('__standard_response__')
    codec.decode.mockReturnValueOnce('__output__')

    const context = { context: true }
    const signal = AbortSignal.timeout(100)
    const lastEventId = '__lastEventId__'

    const output = await link.call(['planet', 'create'], { name: 'Earth' }, { context, signal, lastEventId })

    expect(output).toEqual('__output__')

    expect(codec.encode).toHaveBeenCalledTimes(1)
    expect(codec.encode).toHaveBeenCalledWith(['planet', 'create'], { name: 'Earth' }, { context, signal, lastEventId })

    expect(client.call).toHaveBeenCalledTimes(1)
    expect(client.call).toHaveBeenCalledWith('__standard_request__', { context, signal, lastEventId }, ['planet', 'create'], { name: 'Earth' })

    expect(codec.decode).toHaveBeenCalledTimes(1)
    expect(codec.decode).toHaveBeenCalledWith('__standard_response__', { context, signal, lastEventId }, ['planet', 'create'], { name: 'Earth' })

    expect(interceptor).toHaveBeenCalledTimes(1)
    expect(interceptor).toHaveBeenCalledWith({
      next: expect.any(Function),
      path: ['planet', 'create'],
      input: { name: 'Earth' },
      options: { context, signal, lastEventId },
    })

    expect(clientInterceptor).toHaveBeenCalledTimes(1)
    expect(clientInterceptor).toHaveBeenCalledWith({
      next: expect.any(Function),
      request: '__standard_request__',
    })
  })

  describe('event iterator', () => {
    const eventIteratorMaxRetries = vi.fn()
    const eventIteratorRetryDelay = vi.fn()
    const eventIteratorShouldRetry = vi.fn()

    const link = new StandardLink(codec, client, {
      eventIteratorMaxRetries,
      eventIteratorRetryDelay,
      eventIteratorShouldRetry,
    })

    it('should create an auto retry event iterator', async () => {
      codec.decode.mockImplementation(async function* () {
        yield 1
      })

      const iterator = await link.call(['planet', 'create'], { name: 'Earth' }, { context: {} })

      expect(iterator).toBe(createAutoRetryEventIteratorSpy.mock.results[0]!.value)

      expect(createAutoRetryEventIteratorSpy).toHaveBeenCalledTimes(1)
      expect(createAutoRetryEventIteratorSpy).toHaveBeenCalledWith(
        codec.decode.mock.results[0]!.value,
        expect.any(Function),
        undefined,
      )
    })

    it('should retry on error', async () => {
      eventIteratorMaxRetries.mockResolvedValue(1)
      eventIteratorRetryDelay.mockResolvedValue(0)
      eventIteratorShouldRetry.mockResolvedValue(true)

      const error = new Error('BAD_GATEWAY')

      codec.decode.mockImplementation(async function*() {
        yield withEventMeta({ value: 1 }, { id: '1', retry: 1000 })
        throw error
      })

      const iterator = await link.call(['planet', 'create'], { name: 'Earth' }, { context: { context: true }, lastEventId: '0' }) as any

      expect(codec.encode).toHaveBeenCalledTimes(1)
      expect(codec.encode).toHaveBeenNthCalledWith(1, ['planet', 'create'], { name: 'Earth' }, { context: { context: true }, lastEventId: '0' })

      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })
      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })

      expect(codec.encode).toHaveBeenCalledTimes(2)
      expect(codec.encode).toHaveBeenNthCalledWith(2, ['planet', 'create'], { name: 'Earth' }, { context: { context: true }, lastEventId: '1' })

      codec.decode.mockImplementation(async function* () {
        throw error
      })

      await expect(iterator.next()).rejects.toEqual(error)

      expect(codec.encode).toHaveBeenCalledTimes(3)
      expect(codec.encode).toHaveBeenNthCalledWith(3, ['planet', 'create'], { name: 'Earth' }, { context: { context: true }, lastEventId: '1' })
    })

    it('should not retry on reach max retry times', async () => {
      eventIteratorMaxRetries.mockResolvedValue(0)
      eventIteratorRetryDelay.mockResolvedValue(0)
      eventIteratorShouldRetry.mockResolvedValue(true)

      const error = new Error('BAD_GATEWAY')

      codec.decode.mockImplementation(async function*() {
        yield withEventMeta({ value: 1 }, { id: '1', retry: 1000 })
        throw error
      })

      const iterator = await link.call(['planet', 'create'], { name: 'Earth' }, { context: { } }) as any

      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })
      await expect(iterator.next()).rejects.toEqual(error)

      expect(codec.encode).toHaveBeenCalledTimes(1)
      expect(codec.encode).toHaveBeenNthCalledWith(1, ['planet', 'create'], { name: 'Earth' }, { context: { } })
    })

    it('should not retry on signal aborted', async () => {
      eventIteratorMaxRetries.mockResolvedValue(99)
      eventIteratorRetryDelay.mockResolvedValue(0)
      eventIteratorShouldRetry.mockResolvedValue(true)

      const error = new Error('BAD_GATEWAY')

      codec.decode.mockImplementation(async function* () {
        yield withEventMeta({ value: 1 }, { id: '1', retry: 1000 })
        throw error
      })

      const controller = new AbortController()
      const signal = controller.signal

      const iterator = await link.call(['planet', 'create'], { name: 'Earth' }, { context: {}, signal }) as any

      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })
      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })
      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })

      expect(codec.encode).toHaveBeenCalledTimes(3)
      expect(codec.encode).toHaveBeenNthCalledWith(3, ['planet', 'create'], { name: 'Earth' }, { context: {}, signal, lastEventId: '1' })

      controller.abort()

      await expect(iterator.next()).rejects.toEqual(error)
    })

    it('should not retry when should not retry', async () => {
      eventIteratorMaxRetries.mockResolvedValue(99)
      eventIteratorRetryDelay.mockResolvedValue(0)
      eventIteratorShouldRetry.mockResolvedValue(true)

      const error = new Error('BAD_GATEWAY')

      codec.decode.mockImplementation(async function* () {
        yield withEventMeta({ value: 1 }, { id: '1', retry: 1000 })
        throw error
      })

      const controller = new AbortController()
      const signal = controller.signal

      const iterator = await link.call(['planet', 'create'], { name: 'Earth' }, { context: {}, signal }) as any

      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })
      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })
      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })

      expect(codec.encode).toHaveBeenCalledTimes(3)
      expect(codec.encode).toHaveBeenNthCalledWith(3, ['planet', 'create'], { name: 'Earth' }, { context: {}, signal, lastEventId: '1' })

      eventIteratorShouldRetry.mockResolvedValue(false)

      await expect(iterator.next()).rejects.toEqual(error)
    })

    it('should delay retry', async () => {
      eventIteratorMaxRetries.mockResolvedValue(99)
      eventIteratorRetryDelay.mockResolvedValue(100)
      eventIteratorShouldRetry.mockResolvedValue(true)

      const error = new Error('BAD_GATEWAY')

      codec.decode.mockImplementation(async function* () {
        yield withEventMeta({ value: 1 }, { id: '1', retry: 1000 })
        throw error
      })

      const controller = new AbortController()
      const signal = controller.signal

      const iterator = await link.call(['planet', 'create'], { name: 'Earth' }, { context: {}, signal }) as any

      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })

      const start = Date.now()

      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })

      expect(Date.now() - start).toBeGreaterThanOrEqual(100)
      expect(Date.now() - start).toBeLessThan(120)
    })

    it('should throw InvalidEventIteratorRetryResponse when retry response is invalid', async () => {
      eventIteratorMaxRetries.mockResolvedValue(1)
      eventIteratorRetryDelay.mockResolvedValue(0)
      eventIteratorShouldRetry.mockResolvedValue(true)

      const error = new Error('BAD_GATEWAY')

      codec.decode.mockImplementation(async function* () {
        yield withEventMeta({ value: 1 }, { id: '1', retry: 1000 })
        throw error
      })

      const iterator = await link.call(['planet', 'create'], { name: 'Earth' }, { context: { } }) as any

      codec.decode.mockResolvedValueOnce({})

      await expect(iterator.next()).resolves.toEqual({ done: false, value: { value: 1 } })
      await expect(iterator.next()).rejects.toBeInstanceOf(InvalidEventIteratorRetryResponse)
    })
  })
})
