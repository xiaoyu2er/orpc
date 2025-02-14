import { ORPCError } from '@orpc/contract'
import { os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supportedDataTypes } from '../../../../server/tests/shared'
import { RPCLink } from './orpc-link'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rpcLink', () => {
  // Mock setup
  const mockFetch = vi.fn()
  const mockHeaders = vi.fn()
  const mockRPCSerializer = {
    serialize: vi.fn(),
    deserialize: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    mockRPCSerializer.serialize.mockReturnValue('encoded-body')
    mockRPCSerializer.deserialize.mockReturnValue('decoded-data')
  })

  // Test basic successful call
  it('should make a successful call with correct parameters', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com',
      fetch: mockFetch,
      rpcSerializer: mockRPCSerializer as any,
    })

    const mockResponseData = { id: 1, name: 'Test User' }
    mockFetch.mockResolvedValueOnce(new Response('encoded-body'))
    mockRPCSerializer.deserialize.mockResolvedValueOnce(mockResponseData)

    const result = await link.call(['users', 'get'], { id: 1 }, { context: { auth: 'token' } })

    // Verify fetch was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith(
      new URL('http://api.example.com/users/get'),
      {
        method: 'POST',
        headers: expect.any(Headers),
        body: '"encoded-body"',
        signal: undefined,
      },
      { auth: 'token' },
    )

    // Verify headers
    const headers = mockFetch.mock.calls[0]![1].headers

    // Verify payload codec usage
    expect(mockRPCSerializer.serialize).toHaveBeenCalledWith({ id: 1 })
    expect(mockRPCSerializer.deserialize).toHaveBeenCalledWith('encoded-body')

    // Verify the final result matches the decoded data
    expect(result).toEqual(mockResponseData)
  })

  // Test custom headers
  const headers = [
    () => ({ 'Authorization': 'Bearer token', 'Custom-Header': 'custom-value' }),
    async () => ({ 'Authorization': 'Bearer token', 'Custom-Header': 'custom-value' }),
    () => (new Headers({ 'Authorization': 'Bearer token', 'Custom-Header': 'custom-value' })),
    async () => (new Headers({ 'Authorization': 'Bearer token', 'Custom-Header': 'custom-value' })),
  ]
  it.each(headers)('should properly merge custom headers and return decoded data', async (headersFn) => {
    const link = new RPCLink({
      url: 'http://api.example.com',
      headers: headersFn,
      fetch: mockFetch,
      rpcSerializer: mockRPCSerializer as any,
    })

    const mockResponseData = { success: true, json: 'test data' }
    mockFetch.mockResolvedValueOnce(new Response('encoded-body'))
    mockRPCSerializer.deserialize.mockResolvedValueOnce(mockResponseData)

    const result = await link.call(['test'], {}, { context: {} })

    const headers = mockFetch.mock.calls[0]![1].headers
    expect(headers.get('Authorization')).toBe('Bearer token')
    expect(headers.get('Custom-Header')).toBe('custom-value')

    // Verify the result matches the decoded data
    expect(result).toEqual(mockResponseData)
  })

  // Test URL encoding
  it('should properly encode URL parameters and handle response', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com/',
      fetch: mockFetch,
      rpcSerializer: mockRPCSerializer as any,
    })

    const mockResponseData = { encoded: true, path: 'success' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })
    mockRPCSerializer.deserialize.mockResolvedValueOnce(mockResponseData)

    const result = await link.call(['path with spaces', 'special/chars'], {}, { context: {} })

    expect(mockFetch).toHaveBeenCalledWith(
      new URL('http://api.example.com/path%20with%20spaces/special%2Fchars'),
      expect.any(Object),
      expect.any(Object),
    )

    // Verify the result matches the decoded data
    expect(result).toEqual(mockResponseData)
  })

  // Test error handling
  it('should properly handle server errors', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com',
      fetch: mockFetch,
      rpcSerializer: mockRPCSerializer as any,
    })

    const errorResponse = new Response(JSON.stringify({ json: '__mocked__', meta: [] }), {
      status: 500,
    })

    const errorData = {
      code: 'CUSTOM_ERROR',
      message: 'Custom error message',
      status: 500,
    }

    mockFetch.mockResolvedValue(errorResponse)
    mockRPCSerializer.deserialize.mockResolvedValueOnce(errorData)

    await expect(link.call(['test'], {}, { context: {} }))
      .rejects
      .toThrow(ORPCError)
  })

  // Test with default payload codec
  it('should use default ORPCPayloadCodec when none provided and return result', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com',
      fetch: mockFetch,
    })

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ json: '__mocked__', meta: [] })))

    expect(link.call(['test'], {}, { context: {} })).rejects.toThrow('Invalid RPC response')
  })

  it('should use default fetch when none provided', async () => {
    const realFetch = globalThis.fetch
    globalThis.fetch = mockFetch

    const link = new RPCLink({
      url: 'http://api.example.com',
      rpcSerializer: mockRPCSerializer as any,
    })

    const mockResponse = new Response(JSON.stringify({ json: '__mocked__', meta: [] }))
    mockFetch.mockReturnValue(mockResponse)

    const result = await link.call(['test'], {}, { context: {} })

    expect(result).toEqual('decoded-data')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockRPCSerializer.deserialize).toHaveBeenCalledTimes(1)
    expect(mockRPCSerializer.deserialize).toHaveBeenCalledWith(JSON.stringify({ json: '__mocked__', meta: [] }))

    globalThis.fetch = realFetch
  })

  // Test with AbortController signal
  it('should properly handle AbortController signal and return result', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com',
      fetch: mockFetch,
      rpcSerializer: mockRPCSerializer as any,
    })

    const mockResponseData = { signal: 'handled' }
    const abortController = new AbortController()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })
    mockRPCSerializer.deserialize.mockResolvedValueOnce(mockResponseData)

    const result = await link.call(['test'], {}, {
      context: {},
      signal: abortController.signal,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        signal: abortController.signal,
      }),
      expect.any(Object),
    )

    expect(result).toEqual(mockResponseData)
  })

  it('should handle aborted requests properly', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com',
      fetch: mockFetch,
      rpcSerializer: mockRPCSerializer as any,
    })

    const abortController = new AbortController()
    mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'))

    const promise = link.call(['test'], {}, {
      context: {},
      signal: abortController.signal,
    })

    abortController.abort()

    await expect(promise).rejects.toThrow('The operation was aborted')
  })

  describe('custom method', () => {
    it('work with GET method', async () => {
      const mockMethod = vi.fn()

      const link = new RPCLink({
        url: 'http://api.example.com',
        fetch: mockFetch,
        method: mockMethod,
      })

      mockMethod.mockResolvedValueOnce('GET')
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ json: '__mocked__', meta: [] })))

      await expect(link.call(['test'], '__input__', { context: {} })).rejects.toThrow('Invalid RPC response')

      expect(mockMethod).toHaveBeenCalledWith(['test'], '__input__', {})
      expect(mockFetch).toHaveBeenCalledOnce()
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('http://api.example.com/test?data=%7B%22json%22%3A%22__input__%22%2C%22meta%22%3A%5B%5D%7D'),
        { method: 'GET', headers: expect.any(Headers) },
        {},
      )
    })

    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'] as const

    it.each(methods)('work with %s method', async (method) => {
      const mockMethod = vi.fn()

      const link = new RPCLink({
        url: 'http://api.example.com',
        fetch: mockFetch,
        method: mockMethod,
      })

      mockMethod.mockResolvedValueOnce(method)
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ json: '__mocked__', meta: [] })))

      await expect(link.call(['test'], '__input__', { context: {} })).rejects.toThrow('Invalid RPC response')

      expect(mockMethod).toHaveBeenCalledWith(['test'], '__input__', {})
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('http://api.example.com/test'),
        {
          method,
          headers: expect.any(Headers),
          body: JSON.stringify({ json: '__input__', meta: [] }),
        },
        {},
      )
    })

    it('work when GET method and url is conflicted', async () => {
      const mockMethod = vi.fn()

      const link = new RPCLink({
        url: 'http://api.example.com/?data=xin&meta=chao',
        fetch: mockFetch,
        method: mockMethod,
      })

      mockMethod.mockResolvedValueOnce('GET')
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ json: '__mocked__', meta: [] })))

      await expect(link.call(['test'], '__input__', { context: {} })).rejects.toThrow('Invalid RPC response')

      expect(mockMethod).toHaveBeenCalledWith(['test'], '__input__', {})
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('http://api.example.com/?data=xin&meta=chao%2Ftest&data=%7B%22json%22%3A%22__input__%22%2C%22meta%22%3A%5B%5D%7D'),
        { method: 'GET', headers: expect.any(Headers) },
        {},
      )
    })

    it('should fallback to POST method if method is GET and payload contain file', async () => {
      const mockMethod = vi.fn()
      const link = new RPCLink({
        url: 'http://api.example.com',
        fetch: mockFetch,
        method: mockMethod,
        fallbackMethod: 'POST',
      })

      mockMethod.mockResolvedValueOnce('GET')
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ json: '__mocked__', meta: [] })))

      const file = new File([''], 'file.txt', { type: 'text/plain' })

      await expect(link.call(['test'], { file }, { context: {} })).rejects.toThrow('Invalid RPC response')

      expect(mockMethod).toHaveBeenCalledWith(['test'], { file }, {})
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('http://api.example.com/test'),
        {
          method: 'POST',
          headers: expect.any(Headers),
          body: expect.any(FormData),
        },
        {},
      )
    })

    it('method GET should fallback to fallbackMethod if payload too large', async () => {
      const mockMethod = vi.fn()
      const link = new RPCLink({
        url: 'http://api.example.com',
        fetch: mockFetch,
        method: mockMethod,
        fallbackMethod: 'DELETE',
        maxUrlLength: 100,
      })

      mockMethod.mockResolvedValueOnce('GET')
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ json: '__mocked__', meta: [] })))

      await expect(link.call(['test'], '_'.repeat(100), { context: {} })).rejects.toThrow('Invalid RPC response')

      expect(mockMethod).toHaveBeenCalledWith(['test'], '_'.repeat(100), {})
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('http://api.example.com/test'),
        {
          method: 'DELETE',
          headers: expect.any(Headers),
          body: expect.any(String),
        },
        {},
      )
    })
  })
})

describe.each(supportedDataTypes)('rpcLink: $name', ({ value, expected }) => {
  async function assert(value: unknown, expected: unknown): Promise<true> {
    const handler = vi.fn(({ input }) => input)

    const rpcHandler = new RPCHandler(os.handler(handler))

    const rpcLink = new RPCLink({
      url: 'http://api.example.com',
      fetch: async (url, init) => {
        const request = new Request(url, init)
        const { matched, response } = await rpcHandler.handle(request)

        if (matched) {
          return response
        }

        throw new Error('No procedure match')
      },
    })

    const output = await rpcLink.call([], value, { context: {} })

    expect(output).toEqual(expected)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ input: expected }))

    return true
  }

  it('should work on flat', async () => {
    expect(await assert(value, expected)).toBe(true)
  })

  it('should work on nested object', async () => {
    expect(await assert({
      data: value,
    }, {
      data: expected,
    })).toBe(true)
  })

  it('should work on complex object', async () => {
    expect(await assert({
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
    })).toBe(true)
  })
})
