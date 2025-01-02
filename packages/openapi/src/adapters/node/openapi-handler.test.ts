import type { Router } from 'hono/router'
import { createRequest, sendResponse } from '@mjackson/node-fetch-server'
import { ContractProcedure } from '@orpc/contract'
import { createProcedureClient, os, Procedure } from '@orpc/server'
import { ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE } from '@orpc/shared'
import { LinearRouter } from 'hono/router/linear-router'
import { PatternRouter } from 'hono/router/pattern-router'
import { TrieRouter } from 'hono/router/trie-router'
import { OpenAPIHandler } from './openapi-handler'

vi.mock('@orpc/server', async original => ({
  ...await original(),
  createProcedureClient: vi.fn(() => vi.fn()),
}))

vi.mock('@mjackson/node-fetch-server', async origin => ({
  ...await origin(),
  createRequest: vi.fn(),
  sendResponse: vi.fn(),
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

  const req = { __request: true } as any
  const res = { __response: true } as any

  it('should return a 404 response if no matching procedure is found', async () => {
    const handler = new OpenAPIHandler(hono, router)

    const mockRequest = new Request('https://example.com/not_found', {
      headers: new Headers({}),
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(404)

    const body = await response?.text()
    expect(body).toContain('Not found')
  })

  it('should return a 200 response with serialized output if procedure is resolved successfully', async () => {
    const handler = new OpenAPIHandler(hono, router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const mockRequest = new Request('https://example.com/ping?value=123', {
      headers: new Headers({}),
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual('__mocked__')

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123' }, { signal: undefined })
  })

  it('support params', async () => {
    const handler = new OpenAPIHandler(hono, router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const mockRequest = new Request('https://example.com/pong/unnoq', {
      method: 'POST',
      body: new Blob([JSON.stringify({ value: '123' })], { type: 'application/json' }),
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual('__mocked__')

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123', name: 'unnoq' }, { signal: undefined })
  })

  it('should handle unexpected errors and return a 500 response', async () => {
    const handler = new OpenAPIHandler(hono, router)

    vi.mocked(createProcedureClient).mockImplementationOnce(() => {
      throw new Error('Unexpected error')
    })

    const mockRequest = new Request('https://example.com/ping')

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

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

    const controller = new AbortController()
    const signal = controller.signal

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res, { signal })

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual('__mocked__')

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123' }, { signal })
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

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(404)

    expect(onStart).toBeCalledTimes(1)
    expect(onSuccess).toBeCalledTimes(0)
    expect(onError).toBeCalledTimes(1)
  })

  it('conditions', () => {
    const handler = new OpenAPIHandler(hono, router)

    expect(handler.condition({ headers: {} } as any)).toBe(true)
    expect(handler.condition({ headers: { [ORPC_HANDLER_HEADER]: ORPC_HANDLER_VALUE } } as any)).toBe(false)
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

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(200)

    expect(coerce).toBeCalledTimes(1)
    expect(coerce).toBeCalledWith(undefined, { value: '123' })
    expect(createProcedureClient).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureClient).mock.results[0]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureClient).mock.results[0]?.value).toBeCalledWith('__mocked__', { signal: undefined })
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
        }),
        handler: vi.fn(),
      }),
    }

    const handler = new OpenAPIHandler(hono, router)

    const mockRequest = new Request('https://example.com/ping')

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

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
        }),
        handler: vi.fn(),
      }),
    }

    const handler = new OpenAPIHandler(hono, router)

    const mockRequest = new Request('https://example.com/ping', {
      method: 'POST',
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response.status).toBe(404)

    vi.clearAllMocks()

    const mockRequest2 = new Request('https://example.com/ping?method=DeleTe', {
      method: 'PATCH',
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest2)

    await handler.handle(req, res)

    const response2 = vi.mocked(sendResponse).mock.calls![0]![1]

    // only allow custom method when method is POST
    expect(response2.status).toBe(404)

    vi.clearAllMocks()

    const mockRequest3 = new Request('https://example.com/ping?method=DeleTe', {
      method: 'POST',
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest3)

    await handler.handle(req, res)

    const response3 = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response3.status).toBe(200)
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

      const mockRequest = new Request('https://example.com/ping?value=123')

      vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

      await handler.handle(req, res)

      expect(mockClient).toBeCalledTimes(1)
      expect(mockClient).toBeCalledWith({ value: '123' }, { signal: undefined })

      vi.clearAllMocks()

      const mockRequest2 = new Request('https://example.com/pong/unnoq?value=123', {
        method: 'POST',
        body: new Blob([JSON.stringify({ value: '456' })], { type: 'application/json' }),
      })

      vi.mocked(createRequest).mockReturnValueOnce(mockRequest2)

      await handler.handle(req, res)

      expect(mockClient).toBeCalledTimes(1)
      expect(mockClient).toBeCalledWith({ value: '456', name: 'unnoq' }, { signal: undefined })
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

      const mockRequest = new Request('https://example.com/ping?value=123', {
        headers: {
          'x-custom-header': 'custom-value',
        },
      })

      vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

      await handler.handle(req, res)

      expect(mockClient).toBeCalledTimes(1)
      expect(mockClient).toBeCalledWith(
        {
          params: {},
          query: { value: '123' },
          headers: { 'x-custom-header': 'custom-value' },
          body: undefined,
        },
        { signal: undefined },
      )

      vi.clearAllMocks()

      const mockRequest2 = new Request('https://example.com/pong/hud?value=123', {
        method: 'POST',
        body: new Blob([JSON.stringify({ value: '456' })], { type: 'application/json' }),
        headers: {
          'x-custom-header': 'custom-value',
        },
      })

      vi.mocked(createRequest).mockReturnValueOnce(mockRequest2)

      await handler.handle(req, res)

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
        { signal: undefined },
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

      const mockRequest = new Request('https://example.com/ping?value=123')

      vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

      await handler.handle(req, res)

      const response = vi.mocked(sendResponse).mock.calls![0]![1]

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

      const mockRequest = new Request('https://example.com/ping?value=123')

      vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

      await handler.handle(req, res)

      const response = vi.mocked(sendResponse).mock.calls![0]![1]

      expect(await response?.json()).toBe('__mocked__')
      expect(response?.headers.get('x-custom-header')).toBe('custom-value')

      vi.clearAllMocks()
      const mockRequest2 = new Request('https://example.com/ping?value=123')

      mockClient.mockReturnValueOnce({ body: '__mocked2__' })
      vi.mocked(createRequest).mockReturnValueOnce(mockRequest2)

      await handler.handle(req, res)

      const response2 = vi.mocked(sendResponse).mock.calls![0]![1]
      expect(await response2?.json()).toBe('__mocked2__')

      vi.clearAllMocks()
      const mockRequest3 = new Request('https://example.com/ping?value=123')

      mockClient.mockReturnValueOnce({ headers: { 'x-custom-header': 'custom-value2' } })
      vi.mocked(createRequest).mockReturnValueOnce(mockRequest3)

      await handler.handle(req, res)

      const response3 = vi.mocked(sendResponse).mock.calls![0]![1]
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
      const mockRequest = new Request('https://example.com/ping?value=123')

      vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

      await handler.handle(req, res)

      const response = vi.mocked(sendResponse).mock.calls![0]![1]

      expect(response.status).toBe(500)
    })
  })

  it('should end response', async () => {
    const handler = new OpenAPIHandler(hono, router)
    const mockRequest = new Request('https://example.com/not_found', {
      headers: new Headers({}),
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    expect(createRequest).toHaveBeenCalledTimes(1)
    expect(createRequest).toHaveBeenCalledWith(req, res, undefined)

    expect(sendResponse).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith(res, expect.any(Response))
  })

  it('beforeSend hook', async () => {
    const handler = new OpenAPIHandler(hono, router)
    const mockRequest = new Request('https://example.com/not_found', {
      headers: new Headers({}),
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    const mockBeforeSend = vi.fn()
    await handler.handle(req, res, { beforeSend: mockBeforeSend, context: { __context: true } })

    expect(mockBeforeSend).toHaveBeenCalledTimes(1)
    expect(mockBeforeSend).toHaveBeenCalledWith(expect.any(Response), { __context: true })
  })
})
