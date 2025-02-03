import { ORPCError } from '@orpc/contract'
import { ping } from '../../../tests/shared'
import { RPCCodec } from './rpc-codec'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rpcCodec', () => {
  const rpcSerializer = {
    serialize: vi.fn(),
    deserialize: vi.fn(),
  }

  const codec = new RPCCodec(rpcSerializer)

  describe('.decode', () => {
    it('with GET method', async () => {
      rpcSerializer.deserialize.mockReturnValueOnce('__deserialized__')

      const url = new URL('http://localhost/api/v1?data=data')
      url.searchParams.append('data', JSON.stringify({ json: '__json__', meta: '__meta__' }))

      const input = await codec.decode({
        method: 'GET',
        url,
        body: vi.fn(),
        headers: {},
      }, undefined, ping)

      expect(input).toEqual('__deserialized__')

      expect(rpcSerializer.deserialize).toHaveBeenCalledOnce()
      expect(rpcSerializer.deserialize).toHaveBeenCalledWith({
        json: '__json__',
        meta: '__meta__',
      })
    })

    it('with non-GET method', async () => {
      const serialized = { json: '__json__', meta: '__meta__' }

      rpcSerializer.deserialize.mockReturnValueOnce('__deserialized__')

      const input = await codec.decode({
        method: 'POST',
        url: new URL('http://localhost/api/v1?data=data'),
        body: vi.fn(async () => serialized),
        headers: {},
      }, undefined, ping)

      expect(input).toEqual('__deserialized__')

      expect(rpcSerializer.deserialize).toHaveBeenCalledOnce()
      expect(rpcSerializer.deserialize).toHaveBeenCalledWith({
        json: '__json__',
        meta: '__meta__',
      })
    })
  })

  it('.encode', async () => {
    rpcSerializer.serialize.mockReturnValueOnce('__serialized__')

    const response = codec.encode('__output__', ping)

    expect(response).toEqual({
      status: 200,
      headers: {},
      body: '__serialized__',
    })

    expect(rpcSerializer.serialize).toHaveBeenCalledOnce()
    expect(rpcSerializer.serialize).toHaveBeenCalledWith('__output__')
  })

  it('.encodeError', async () => {
    rpcSerializer.serialize.mockReturnValueOnce('__serialized__')

    const error = new ORPCError('BAD_GATEWAY', {
      data: '__data__',
    })
    const response = codec.encodeError(error)

    expect(response).toEqual({
      status: error.status,
      headers: {},
      body: '__serialized__',
    })

    expect(rpcSerializer.serialize).toHaveBeenCalledOnce()
    expect(rpcSerializer.serialize).toHaveBeenCalledWith(error.toJSON())
  })
})
