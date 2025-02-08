import { supportedDataTypes } from '../../../tests/shared'
import { RPCSerializer } from './rpc-serializer'

describe.each(supportedDataTypes)('rpcSerializer: $name', ({ value, expected }) => {
  const serializer = new RPCSerializer()

  function serializeAndDeserialize(value: unknown): unknown {
    const serialized = serializer.serialize(value)

    if (serialized instanceof FormData || serialized instanceof Blob) {
      return serializer.deserialize(serialized)
    }

    if (serialized === undefined) {
      return serializer.deserialize(undefined)
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
