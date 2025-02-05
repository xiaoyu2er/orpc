import { ORPCError } from '@orpc/contract'
import { ping } from '../../../tests/shared'
import { RPCCodec } from './rpc-codec'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rpcCodec', () => {
  const serializer = {
    serialize: vi.fn(),
    deserialize: vi.fn(),
  }

  const codec = new RPCCodec({
    serializer,
  })

  describe('.decode', () => {
    it('with GET method', async () => {
      serializer.deserialize.mockReturnValueOnce('__deserialized__')

      const url = new URL('http://localhost/api/v1?data=data')
      url.searchParams.append('data', JSON.stringify({ json: '__json__', meta: '__meta__' }))

      const input = await codec.decode({
        raw: {},
        method: 'GET',
        url,
        body: vi.fn(),
        headers: {},
      }, undefined, ping)

      expect(input).toEqual('__deserialized__')

      expect(serializer.deserialize).toHaveBeenCalledOnce()
      expect(serializer.deserialize).toHaveBeenCalledWith({
        json: '__json__',
        meta: '__meta__',
      })
    })

    it('with non-GET method', async () => {
      const serialized = { json: '__json__', meta: '__meta__' }

      serializer.deserialize.mockReturnValueOnce('__deserialized__')

      const input = await codec.decode({
        raw: {},
        method: 'POST',
        url: new URL('http://localhost/api/v1?data=data'),
        body: vi.fn(async () => serialized),
        headers: {},
      }, undefined, ping)

      expect(input).toEqual('__deserialized__')

      expect(serializer.deserialize).toHaveBeenCalledOnce()
      expect(serializer.deserialize).toHaveBeenCalledWith({
        json: '__json__',
        meta: '__meta__',
      })
    })
  })

  it('.encode', async () => {
    serializer.serialize.mockReturnValueOnce('__serialized__')

    const response = codec.encode('__output__', ping)

    expect(response).toEqual({
      status: 200,
      headers: {},
      body: '__serialized__',
    })

    expect(serializer.serialize).toHaveBeenCalledOnce()
    expect(serializer.serialize).toHaveBeenCalledWith('__output__')
  })

  it('.encodeError', async () => {
    serializer.serialize.mockReturnValueOnce('__serialized__')

    const error = new ORPCError('BAD_GATEWAY', {
      data: '__data__',
    })
    const response = codec.encodeError(error)

    expect(response).toEqual({
      status: error.status,
      headers: {},
      body: '__serialized__',
    })

    expect(serializer.serialize).toHaveBeenCalledOnce()
    expect(serializer.serialize).toHaveBeenCalledWith(error.toJSON())
  })

  it('work without arguments', () => {
    const codec = new RPCCodec()
  })
})
