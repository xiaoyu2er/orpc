import type { Router } from 'hono/router'
import { ContractProcedure } from '@orpc/contract'
import { createProcedureClient, os, Procedure } from '@orpc/server'
import { LinearRouter } from 'hono/router/linear-router'
import { PatternRouter } from 'hono/router/pattern-router'
import { TrieRouter } from 'hono/router/trie-router'
import { OpenAPIHandler } from './openapi-handler'

vi.mock('@orpc/server', async original => ({
  ...await original(),
  createProcedureClient: vi.fn(() => vi.fn()),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const hono = [
  ['LinearRouter', LinearRouter],
  // ['RegExpRouter', new RegExpRouter<any>()],
  ['TrieRouter', TrieRouter],
  ['PatternRouter', PatternRouter],
] as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each(hono)('openAPIHandler: %s', (_, HonoConstructor) => {
  let hono = new HonoConstructor() as Router<any>

  beforeEach(() => {
    hono = new HonoConstructor()
  })

  const ping = os.route({
    method: 'GET',
    path: '/ping',
  })
    .handler(vi.fn())

  const pong = os.route({
    method: 'POST',
    path: '/pong/{name}',
  })
    .handler(vi.fn())

  const router = {
    ping: os.lazy(() => Promise.resolve({ default: ping })),
    pong,
    nested: os.lazy(() => Promise.resolve({
      default: {
        ping,
        pong: os.lazy(() => Promise.resolve({ default: pong })),
      },
    })),
  }

  it('should return matched=false if no matching procedure is found', async () => {
    const handler = new OpenAPIHandler(hono, router)

    const mockRequest = new Request('https://example.com/not_found', {
      headers: new Headers({}),
    })

    const { matched, response } = await handler.handle(mockRequest)

    expect(matched).toBe(false)
    expect(response).toBeUndefined()
  })

  it('should return a 200 response with serialized output if procedure is resolved successfully', async () => {
    const handler = new OpenAPIHandler(hono, router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const mockRequest = new Request('https://example.com/ping?value=123', {
      headers: new Headers({}),
    })

    const { response } = await handler.handle(mockRequest)

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual('__mocked__')

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123' }, { signal: mockRequest.signal })
  })

  it('support params', async () => {
    const handler = new OpenAPIHandler(hono, router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const mockRequest = new Request('https://example.com/pong/unnoq', {
      method: 'POST',
      body: new Blob([JSON.stringify({ value: '123' })], { type: 'application/json' }),
    })

    const { response } = await handler.handle(mockRequest)

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual('__mocked__')

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123', name: 'unnoq' }, { signal: mockRequest.signal })
  })

  it('should handle unexpected errors and return a 500 response', async () => {
    const handler = new OpenAPIHandler(hono, router)

    vi.mocked(createProcedureClient).mockImplementationOnce(() => {
      throw new Error('Unexpected error')
    })

    const mockRequest = new Request('https://example.com/ping')

    const { response } = await handler.handle(mockRequest)

    expect(response?.status).toBe(500)

    const body = await response?.text()
    expect(body).toContain('Internal server error')
  })

  it('support signal', async () => {
    const handler = new OpenAPIHandler(hono, router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const mockRequest = new Request('https://example.com/ping?value=123', {
      headers: new Headers({}),
    })

    const { response } = await handler.handle(mockRequest, { })

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual('__mocked__')

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123' }, { signal: mockRequest.signal })
  })

  it('hooks', async () => {
    const mockRequest = new Request('https://example.com/not_found', {
      headers: new Headers({}),
      method: 'POST',
      body: JSON.stringify({ data: { value: '123' }, meta: [] }),
    })

    const onStart = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()

    const handler = new OpenAPIHandler(hono, router, {
      onStart,
      onSuccess,
      onError,
    })

    const { matched } = await handler.handle(mockRequest)

    expect(matched).toBe(false)

    expect(onStart).toBeCalledTimes(1)
    expect(onSuccess).toBeCalledTimes(1)
    expect(onError).toBeCalledTimes(0)
  })

  it('schema coercer', async () => {
    const coerce = vi.fn().mockReturnValue('__mocked__')

    const handler = new OpenAPIHandler(hono, router, {
      schemaCoercers: [
        {
          coerce,
        },
      ],
    })

    const mockRequest = new Request('https://example.com/ping?value=123', {
      headers: new Headers({}),
    })

    const { response } = await handler.handle(mockRequest)

    expect(response?.status).toBe(200)

    expect(coerce).toBeCalledTimes(1)
    expect(coerce).toBeCalledWith(undefined, { value: '123' })
    expect(createProcedureClient).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureClient).mock.results[0]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureClient).mock.results[0]?.value).toBeCalledWith('__mocked__', { signal: mockRequest.signal })
  })

  it('custom success status', async () => {
    const router = {
      ping: new Procedure({
        contract: new ContractProcedure({
          route: {
            method: 'GET',
            path: '/ping',
            successStatus: 298,
          },
          InputSchema: undefined,
          OutputSchema: undefined,
          errorMap: {},
        }),
        handler: vi.fn(),
        middlewares: [],
        inputValidationIndex: 0,
        outputValidationIndex: 0,
      }),
    }

    const handler = new OpenAPIHandler(hono, router)

    const mockRequest = new Request('https://example.com/ping')

    const { response } = await handler.handle(mockRequest)

    expect(response?.status).toBe(298)
  })

  it('custom method', async () => {
    const router = {
      ping: new Procedure({
        contract: new ContractProcedure({
          route: {
            method: 'DELETE',
            path: '/ping',
          },
          InputSchema: undefined,
          OutputSchema: undefined,
          errorMap: {},
        }),
        handler: vi.fn(),
        middlewares: [],
        inputValidationIndex: 0,
        outputValidationIndex: 0,
      }),
    }

    const handler = new OpenAPIHandler(hono, router)

    expect(
      await handler.handle(new Request('https://example.com/ping', {
        method: 'POST',
      })),
    ).toSatisfy((result: any) => result?.matched === false)

    // only allow custom method when method is POST
    expect(
      await handler.handle(new Request('https://example.com/ping?method=DeleTe', {
        method: 'PATCH',
      })),
    ).toSatisfy((result: any) => result?.matched === false)

    expect(
      await handler.handle(new Request('https://example.com/ping?method=DeleTe', {
        method: 'POST',
      })),
    ).toSatisfy((result: any) => result?.matched === true)
  })

  describe('input structure', () => {
    it('compact', async () => {
      const handler = new OpenAPIHandler(hono, {
        ping: ping.route({
          method: 'GET',
          path: '/ping',
          inputStructure: 'compact',
        }),
        pong: pong.route({
          method: 'POST',
          path: '/pong/{name}',
          inputStructure: 'compact',
        }),
      })

      const mockClient = vi.fn()
      vi.mocked(createProcedureClient).mockReturnValue(mockClient)

      const request = new Request('https://example.com/ping?value=123')
      await handler.handle(request)

      expect(mockClient).toBeCalledTimes(1)
      expect(mockClient).toBeCalledWith({ value: '123' }, { signal: request.signal })

      mockClient.mockClear()

      const request2 = new Request('https://example.com/pong/unnoq?value=123', {
        method: 'POST',
        body: new Blob([JSON.stringify({ value: '456' })], { type: 'application/json' }),
      })
      await handler.handle(request2)

      expect(mockClient).toBeCalledTimes(1)
      expect(mockClient).toBeCalledWith({ value: '456', name: 'unnoq' }, { signal: request2.signal })
    })

    it('detailed', async () => {
      const handler = new OpenAPIHandler(hono, {
        ping: ping.route({
          method: 'GET',
          path: '/ping',
          inputStructure: 'detailed',
        }),
        pong: pong.route({
          method: 'POST',
          path: '/pong/{id}',
          inputStructure: 'detailed',
        }),
      })

      const mockClient = vi.fn()
      vi.mocked(createProcedureClient).mockReturnValue(mockClient)

      const request = new Request('https://example.com/ping?value=123', {
        headers: {
          'x-custom-header': 'custom-value',
        },
      })

      await handler.handle(request)

      expect(mockClient).toBeCalledTimes(1)
      expect(mockClient).toBeCalledWith(
        {
          params: {},
          query: { value: '123' },
          headers: { 'x-custom-header': 'custom-value' },
          body: undefined,
        },
        { signal: request.signal },
      )

      mockClient.mockClear()

      const request2 = new Request('https://example.com/pong/hud?value=123', {
        method: 'POST',
        body: new Blob([JSON.stringify({ value: '456' })], { type: 'application/json' }),
        headers: {
          'x-custom-header': 'custom-value',
        },
      })
      await handler.handle(request2)

      expect(mockClient).toBeCalledTimes(1)
      expect(mockClient).toBeCalledWith(
        {
          params: { id: 'hud' },
          query: { value: '123' },
          headers: {
            'content-type': 'application/json',
            'x-custom-header': 'custom-value',
          },
          body: { value: '456' },
        },
        { signal: request2.signal },
      )
    })
  })

  describe('output structure', () => {
    it('compact', async () => {
      const handler = new OpenAPIHandler(hono, {
        ping: ping.route({
          method: 'GET',
          path: '/ping',
          outputStructure: 'compact',
        }),
      })

      const mockClient = vi.fn(() => Promise.resolve('__mocked__'))
      vi.mocked(createProcedureClient).mockReturnValue(mockClient)

      const { response } = await handler.handle(new Request('https://example.com/ping?value=123'))

      expect(await response?.json()).toBe('__mocked__')
    })

    it('detailed', async () => {
      const handler = new OpenAPIHandler(hono, {
        ping: ping.route({
          method: 'GET',
          path: '/ping',
          outputStructure: 'detailed',
        }),
      })

      const mockClient = vi.fn()
      vi.mocked(createProcedureClient).mockReturnValue(mockClient)

      mockClient.mockReturnValueOnce({ body: '__mocked__', headers: { 'x-custom-header': 'custom-value' } })
      const { response } = await handler.handle(new Request('https://example.com/ping?value=123'))

      expect(await response?.json()).toBe('__mocked__')
      expect(response?.headers.get('x-custom-header')).toBe('custom-value')

      mockClient.mockReturnValueOnce({ body: '__mocked2__' })
      const { response: response2 } = await handler.handle(new Request('https://example.com/ping?value=123'))
      expect(await response2?.json()).toBe('__mocked2__')

      mockClient.mockReturnValueOnce({ headers: { 'x-custom-header': 'custom-value2' } })
      const { response: response3 } = await handler.handle(new Request('https://example.com/ping?value=123'))
      expect(response3?.headers.get('x-custom-header')).toBe('custom-value2')
    })

    const invalidDetailedOutputs = [
      ['not an object', []],
      ['headers is not an object', { headers: [] }],
      ['headers has non-string value', { headers: { abc: 123 } }],
    ] as const

    it.each(invalidDetailedOutputs)('invalid detailed output: %s', async (_, output) => {
      const handler = new OpenAPIHandler(hono, {
        ping: ping.route({
          method: 'GET',
          path: '/ping',
          outputStructure: 'detailed',
        }),
      })

      const mockClient = vi.fn()
      vi.mocked(createProcedureClient).mockReturnValue(mockClient)

      mockClient.mockReturnValueOnce(output)
      const { response } = await handler.handle(new Request('https://example.com/ping?value=123'))

      expect(response?.status).toBe(500)
    })
  })
})
