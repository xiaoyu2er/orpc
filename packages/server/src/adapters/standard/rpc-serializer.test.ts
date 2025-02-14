import { ORPCError } from '@orpc/contract'
import { getEventSourceMeta, isAsyncIteratorObject, setEventSourceMeta } from '@orpc/server-standard'
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

it('rpcSerializer: event-source iterator', async () => {
  const serializer = new RPCSerializer()

  function serializeAndDeserialize(value: unknown): unknown {
    const serialized = serializer.serialize(value)
    return serializer.deserialize(serialized)
  }

  const date = new Date()

  const iterator = (async function* () {
    yield 1
    yield { order: 2, date }
    throw setEventSourceMeta(new ORPCError('BAD_GATEWAY', { data: { order: 3, date } }), { id: '56789' })
  })()

  const deserialized = serializeAndDeserialize(iterator) as any

  expect(deserialized).toSatisfy(isAsyncIteratorObject)
  expect(await deserialized.next()).toEqual({ done: false, value: 1 })
  expect(await deserialized.next()).toEqual({ done: false, value: { order: 2, date } })
  await expect(deserialized.next()).rejects.toSatisfy((e: any) => {
    expect(e).toBeInstanceOf(ORPCError)
    expect(e.code).toBe('BAD_GATEWAY')
    expect(e.data).toEqual({ order: 3, date })
    expect(getEventSourceMeta(e)).toEqual({ id: '56789' })

    return true
  })
})
