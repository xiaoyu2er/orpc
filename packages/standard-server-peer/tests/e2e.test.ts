import { StandardRPCJsonSerializer } from '../../client/src/adapters/standard/rpc-json-serializer'
import { StandardRPCSerializer } from '../../client/src/adapters/standard/rpc-serializer'
import { supportedDataTypes } from '../../client/tests/shared'
import { ClientPeer, ServerPeer } from '../src'

describe.each(supportedDataTypes)('types: %s', ({ value, expected }) => {
  const client = new ClientPeer(async (raw) => {
    const server = new ServerPeer(client.message.bind(client))

    const [id, request] = await server.message(typeof raw === 'string' ? Math.random() < 0.5 ? raw : new TextEncoder().encode(raw) : raw)

    if (!request) {
      return
    }

    await server.response(id, {
      status: 200,
      ...request,
    })
  })

  const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer())

  async function assert(value: unknown, expected: unknown): Promise<void> {
    const response = await client.request({
      headers: {},
      method: 'POST',
      signal: undefined,
      url: new URL('http://localhost:3000'),
      body: serializer.serialize(value),
    })

    const output = await serializer.deserialize(response.body)

    expect(output).toEqual(expected)
  }

  it('should work on flat', async () => {
    await assert(value, expected)
  })

  it('should work on nested object', async () => {
    await assert({ data: value }, { data: expected })
  })

  it('should work on complex object', async () => {
    await assert({
      '!@#$%^^&()[]>?<~_<:"~+!_': value,
      'list': [value],
      'map': new Map([[value, value]]),
      'set': new Set([value]),
      'nested': {
        nested: value,
      },
    }, {
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
