import { ORPCError } from '@orpc/contract'
import { EventSourceErrorEvent, getEventSourceMeta, isAsyncIteratorObject, setEventSourceMeta } from '@orpc/server-standard'
import { supportedDataTypes } from '../../../tests/shared'
import { RPCSerializer } from './rpc-serializer'

describe.each(supportedDataTypes)('rpcSerializer: $name', ({ value, expected }) => {
  const serializer = new RPCSerializer()

  function serializeAndDeserialize(value: unknown): unknown {
    const serialized = serializer.serialize(value)

    if (serialized instanceof FormData) {
      return serializer.deserialize(serialized)
    }

    return serializer.deserialize(JSON.parse(JSON.stringify(serialized))) // like in the real world
  }

  it('should work on flat', async () => {
    expect(
      serializeAndDeserialize(value),
    ).toEqual(
      expected,
    )
  })

  it('should work on nested object', async () => {
    expect(
      serializeAndDeserialize({
        data: value,
      }),
    ).toEqual(
      {
        data: expected,
      },
    )
  })

  it('should work on complex object', async () => {
    expect(
      serializeAndDeserialize({
        '!@#$%^^&()[]>?<~_<:"~+!_': value,
        'list': [value],
        'map': new Map([[value, value]]),
        'set': new Set([value]),
        'nested': {
          nested: value,
        },
      }),
    ).toEqual({
      '!@#$%^^&()[]>?<~_<:"~+!_': expected,
      'list': [expected],
      'map': new Map([[expected, expected]]),
      'set': new Set([expected]),
      'nested': {
        nested: expected,
      },
    })
  })
})

describe('rpcSerializer: event-source iterator', async () => {
  const serializer = new RPCSerializer()

  function serializeAndDeserialize(value: unknown): unknown {
    const serialized = serializer.serialize(value)
    return serializer.deserialize(serialized)
  }

  const date = new Date()

  it('on success', async () => {
    const iterator = (async function* () {
      yield 1
      yield setEventSourceMeta({ order: 2, date }, { retry: 1000 })
      return setEventSourceMeta({ order: 3 }, { id: '123456' })
    })()

    const deserialized = serializeAndDeserialize(iterator) as any

    expect(deserialized).toSatisfy(isAsyncIteratorObject)
    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual(1)
      expect(getEventSourceMeta(value)).toEqual(undefined)

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 2, date })
      expect(getEventSourceMeta(value)).toEqual({ retry: 1000 })

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(true)
      expect(value).toEqual({ order: 3 })
      expect(getEventSourceMeta(value)).toEqual({ id: '123456' })

      return true
    })
  })

  it('on error with ORPCError', async () => {
    const error = setEventSourceMeta(new ORPCError('BAD_GATEWAY', { data: { order: 3 } }), { id: '123456' })

    const iterator = (async function* () {
      yield 1
      yield setEventSourceMeta({ order: 2, date }, { retry: 1000 })
      throw error
    })()

    const deserialized = serializeAndDeserialize(iterator) as any

    expect(deserialized).toSatisfy(isAsyncIteratorObject)
    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual(1)
      expect(getEventSourceMeta(value)).toEqual(undefined)

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 2, date })
      expect(getEventSourceMeta(value)).toEqual({ retry: 1000 })

      return true
    })

    await expect(deserialized.next()).rejects.toSatisfy((e: any) => {
      expect(e).toEqual(error)
      expect(e).toBeInstanceOf(ORPCError)
      expect(e.cause).toBeInstanceOf(EventSourceErrorEvent)

      return true
    })
  })

  it('on error with EventSourceErrorEvent', async () => {
    const error = setEventSourceMeta(new EventSourceErrorEvent({ data: { order: 3 } }), { id: '123456' })

    const iterator = (async function* () {
      yield 1
      yield setEventSourceMeta({ order: 2, date }, { retry: 1000 })
      throw error
    })()

    const deserialized = serializeAndDeserialize(iterator) as any

    expect(deserialized).toSatisfy(isAsyncIteratorObject)
    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual(1)
      expect(getEventSourceMeta(value)).toEqual(undefined)

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 2, date })
      expect(getEventSourceMeta(value)).toEqual({ retry: 1000 })

      return true
    })

    await expect(deserialized.next()).rejects.toSatisfy((e: any) => {
      expect(e).toEqual(error)
      expect(e).toBeInstanceOf(EventSourceErrorEvent)
      expect(e.cause).toBeInstanceOf(EventSourceErrorEvent)

      return true
    })
  })

  it('on error with unknown error when deserialize', async () => {
    const error = setEventSourceMeta(new Error('UNKNOWN'), { id: '123456' })

    const iterator = (async function* () {
      yield serializer.serialize(1)
      yield setEventSourceMeta(serializer.serialize({ order: 2, date }), { retry: 1000 })
      throw error
    })()

    const deserialized = serializer.deserialize(iterator as any) as any

    expect(deserialized).toSatisfy(isAsyncIteratorObject)
    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual(1)
      expect(getEventSourceMeta(value)).toEqual(undefined)

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 2, date })
      expect(getEventSourceMeta(value)).toEqual({ retry: 1000 })

      return true
    })

    await expect(deserialized.next()).rejects.toSatisfy((e: any) => {
      expect(e).toBe(error)

      return true
    })
  })
})
