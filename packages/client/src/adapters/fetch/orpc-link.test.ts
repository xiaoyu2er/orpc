import { ORPCError } from '@orpc/contract'
import { ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE } from '@orpc/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RPCLink } from './orpc-link'

describe('rPCLink', () => {
  // Mock setup
  const mockFetch = vi.fn()
  const mockHeaders = vi.fn()
  const mockPayloadCodec = {
    encode: vi.fn(),
    decode: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    mockPayloadCodec.encode.mockReturnValue({ headers: new Headers(), body: 'encoded-body', method: 'POST' })
    mockPayloadCodec.decode.mockReturnValue({ data: 'decoded-data' })
  })

  // Test basic successful call
  it('should make a successful call with correct parameters', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com',
      fetch: mockFetch,
      payloadCodec: mockPayloadCodec as any,
    })

    const mockResponseData = { id: 1, name: 'Test User' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })
    mockPayloadCodec.decode.mockResolvedValueOnce(mockResponseData)

    const result = await link.call(['users', 'get'], { id: 1 }, { context: { auth: 'token' } })

    // Verify fetch was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith(
      new URL('http://api.example.com/users/get'),
      {
        method: 'POST',
        headers: expect.any(Headers),
        body: 'encoded-body',
        signal: undefined,
      },
      { auth: 'token' },
    )

    // Verify headers
    const headers = mockFetch.mock.calls[0]![1].headers
    expect(headers.get(ORPC_HANDLER_HEADER)).toBe(ORPC_HANDLER_VALUE)

    // Verify payload codec usage
    expect(mockPayloadCodec.encode).toHaveBeenCalledWith({ id: 1 }, 'POST', 'POST')
    expect(mockPayloadCodec.decode).toHaveBeenCalledWith(expect.objectContaining({
      ok: true,
      status: 200,
    }))

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
      payloadCodec: mockPayloadCodec as any,
    })

    const mockResponseData = { success: true, data: 'test data' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })
    mockPayloadCodec.decode.mockResolvedValueOnce(mockResponseData)

    const result = await link.call(['test'], {}, { context: {} })

    const headers = mockFetch.mock.calls[0]![1].headers
    expect(headers.get('Authorization')).toBe('Bearer token')
    expect(headers.get('Custom-Header')).toBe('custom-value')
    expect(headers.get(ORPC_HANDLER_HEADER)).toBe(ORPC_HANDLER_VALUE)

    // Verify the result matches the decoded data
    expect(result).toEqual(mockResponseData)
  })

  // Test URL encoding
  it('should properly encode URL parameters and handle response', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com/',
      fetch: mockFetch,
      payloadCodec: mockPayloadCodec as any,
    })

    const mockResponseData = { encoded: true, path: 'success' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })
    mockPayloadCodec.decode.mockResolvedValueOnce(mockResponseData)

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
      payloadCodec: mockPayloadCodec as any,
    })

    const errorResponse = new Response(JSON.stringify({ data: '__mocked__', meta: [] }), {
      status: 500,
    })

    const errorData = {
      code: 'CUSTOM_ERROR',
      message: 'Custom error message',
      status: 500,
    }

    mockFetch.mockResolvedValue(errorResponse)
    mockPayloadCodec.decode.mockResolvedValueOnce(errorData)

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

    const mockResponseData = { defaultCodec: true }
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: '__mocked__', meta: [] })))

    const result = await link.call(['test'], {}, { context: {} })

    expect(mockFetch).toHaveBeenCalled()
    // Verify that it didn't use our mock codec
    expect(mockPayloadCodec.encode).not.toHaveBeenCalled()
    // The actual result would come from the default ORPCPayloadCodec
    expect(result).toBeDefined()
  })

  it('should use default fetch when none provided', async () => {
    const realFetch = globalThis.fetch
    globalThis.fetch = mockFetch

    const link = new RPCLink({
      url: 'http://api.example.com',
      payloadCodec: mockPayloadCodec as any,
    })

    const mockResponse = new Response(JSON.stringify({ data: '__mocked__', meta: [] }))
    mockFetch.mockReturnValue(mockResponse)

    const result = await link.call(['test'], {}, { context: {} })

    expect(result).toEqual({ data: 'decoded-data' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockPayloadCodec.decode).toHaveBeenCalledTimes(1)
    expect(mockPayloadCodec.decode).toHaveBeenCalledWith(mockResponse)

    globalThis.fetch = realFetch
  })

  // Test with AbortController signal
  it('should properly handle AbortController signal and return result', async () => {
    const link = new RPCLink({
      url: 'http://api.example.com',
      fetch: mockFetch,
      payloadCodec: mockPayloadCodec as any,
    })

    const mockResponseData = { signal: 'handled' }
    const abortController = new AbortController()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })
    mockPayloadCodec.decode.mockResolvedValueOnce(mockResponseData)

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
      payloadCodec: mockPayloadCodec as any,
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
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: '__mocked__', meta: [] })))

      const result = await link.call(['test'], '__input__', { context: {} })

      expect(result).toEqual('__mocked__')
      expect(mockMethod).toHaveBeenCalledWith(['test'], '__input__', {})
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('http://api.example.com/test?data=%22__input__%22&meta=%5B%5D'),
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
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: '__mocked__', meta: [] })))

      const result = await link.call(['test'], '__input__', { context: {} })

      expect(result).toEqual('__mocked__')
      expect(mockMethod).toHaveBeenCalledWith(['test'], '__input__', {})
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('http://api.example.com/test'),
        {
          method,
          headers: expect.any(Headers),
          body: JSON.stringify({ data: '__input__', meta: [] }),
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
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: '__mocked__', meta: [] })))

      const result = await link.call(['test'], '__input__', { context: {} })

      expect(result).toEqual('__mocked__')
      expect(mockMethod).toHaveBeenCalledWith(['test'], '__input__', {})
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('http://api.example.com/?data=xin&meta=chao%2Ftest&data=%22__input__%22&meta=%5B%5D'),
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
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: '__mocked__', meta: [] })))

      const result = await link.call(['test'], { file: new File([''], 'file.txt', { type: 'text/plain' }) }, { context: {} })

      expect(result).toEqual('__mocked__')
      expect(mockMethod).toHaveBeenCalledWith(['test'], { file: new File([''], 'file.txt', { type: 'text/plain' }) }, {})
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
        maxURLLength: 100,
      })

      mockMethod.mockResolvedValueOnce('GET')
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: '__mocked__', meta: [] })))

      const result = await link.call(['test'], '_'.repeat(100), { context: {} })

      expect(result).toEqual('__mocked__')
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

    it('always throw error when url is too long', async () => {
      const link = new RPCLink({
        url: 'http://api.example.com'.repeat(100),
      })

      expect(link.call(['test'], '__input__', { context: {} }))
        .rejects
        .toThrow('Cannot encode the request, please check the url length or payload.')
    })
  })
})
