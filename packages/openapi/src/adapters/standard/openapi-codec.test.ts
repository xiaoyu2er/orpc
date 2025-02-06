import { ORPCError } from '@orpc/contract'
import { Procedure } from '@orpc/server'
import { ping } from '../../../../server/tests/shared'
import { OpenAPICodec } from './openapi-codec'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('openAPICodec', () => {
  const serializer = {
    serialize: vi.fn(),
    deserialize: vi.fn(),
  } as any

  const codec = new OpenAPICodec({
    serializer,
  })

  describe('.decode', () => {
    describe('with compact structure', () => {
      it('with GET method', async () => {
        serializer.deserialize.mockReturnValueOnce('__deserialized__')

        const url = new URL('http://localhost/api/v1?data=data')
        url.searchParams.append('data', JSON.stringify('__data__'))

        const input = await codec.decode({
          raw: {},
          method: 'GET',
          url,
          body: vi.fn(),
          headers: {},
        }, undefined, ping)

        expect(input).toEqual('__deserialized__')

        expect(serializer.deserialize).toHaveBeenCalledOnce()
        expect(serializer.deserialize).toHaveBeenCalledWith(url.searchParams)
      })

      it('with non-GET method', async () => {
        const serialized = '__data__'

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
        expect(serializer.deserialize).toHaveBeenCalledWith(serialized)
      })
    })

    describe('with detailed structure', () => {
      const procedure = new Procedure({
        ...ping['~orpc'],
        route: {
          inputStructure: 'detailed',
        },
      })

      it('with GET method', async () => {
        serializer.deserialize.mockReturnValue('__deserialized__')

        const url = new URL('http://localhost/api/v1?data=data')
        url.searchParams.append('data', JSON.stringify('__data__'))

        const input = await codec.decode({
          raw: {},
          method: 'GET',
          url,
          body: vi.fn(),
          headers: {
            'content-type': 'application/json',
          },
        }, { name: 'John Doe' }, procedure)

        expect(input).toEqual({
          params: { name: 'John Doe' },
          query: '__deserialized__',
          headers: {
            'content-type': 'application/json',
          },
          body: '__deserialized__',
        })

        expect(serializer.deserialize).toHaveBeenCalledTimes(2)
        expect(serializer.deserialize).toHaveBeenNthCalledWith(1, undefined)
        expect(serializer.deserialize).toHaveBeenNthCalledWith(2, url.searchParams)
      })

      it('with non-GET method', async () => {
        const serialized = '__data__'

        serializer.deserialize.mockReturnValue('__deserialized__')
        const url = new URL('http://localhost/api/v1?data=data')

        const input = await codec.decode({
          raw: {},
          method: 'POST',
          url,
          body: vi.fn(async () => serialized),
          headers: {
            'content-type': 'application/json',
          },
        }, { name: 'John Doe' }, procedure)

        expect(input).toEqual({
          params: { name: 'John Doe' },
          query: '__deserialized__',
          headers: {
            'content-type': 'application/json',
          },
          body: '__deserialized__',
        })

        expect(serializer.deserialize).toHaveBeenCalledTimes(2)
        expect(serializer.deserialize).toHaveBeenNthCalledWith(1, serialized)
        expect(serializer.deserialize).toHaveBeenNthCalledWith(2, url.searchParams)
      })
    })
  })

  describe('.encode', async () => {
    it('with compact structure', async () => {
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

    describe('with detailed structure', async () => {
      const procedure = new Procedure({
        ...ping['~orpc'],
        route: {
          outputStructure: 'detailed',
          successStatus: 298,
        },
      })

      it('throw on invalid output', async () => {
        expect(() => codec.encode('__output__', procedure)).toThrowError()
      })

      it('works', async () => {
        serializer.serialize.mockReturnValue('__serialized__')

        const output = {
          body: '__output__',
          headers: {
            'x-custom-header': 'custom-value',
          },
        }
        const response = codec.encode(output, procedure)

        expect(response).toEqual({
          status: 298,
          headers: {
            'x-custom-header': 'custom-value',
          },
          body: '__serialized__',
        })

        expect(codec.encode({}, procedure)).toEqual({
          status: 298,
          headers: {},
          body: '__serialized__',
        })

        expect(serializer.serialize).toHaveBeenCalledTimes(2)
        expect(serializer.serialize).toHaveBeenNthCalledWith(1, '__output__')
        expect(serializer.serialize).toHaveBeenNthCalledWith(2, undefined)
      })
    })
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

  it('work without arguments', async () => {
    const codec = new OpenAPICodec()
  })
})
