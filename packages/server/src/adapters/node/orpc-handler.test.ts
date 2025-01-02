import { createRequest, sendResponse } from '@mjackson/node-fetch-server'
import { ContractProcedure } from '@orpc/contract'
import { ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE } from '@orpc/shared'
import { describe, expect, it, vi } from 'vitest'
import { lazy } from '../../lazy'
import { Procedure } from '../../procedure'
import { createProcedureClient } from '../../procedure-client'
import { ORPCHandler } from './orpc-handler'

vi.mock('../../procedure-client', () => ({
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

describe('oRPCHandler', () => {
  const ping = new Procedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
    }),
    handler: vi.fn(),
  })
  const pong = new Procedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
    }),
    handler: vi.fn(),
  })

  const router = {
    ping: lazy(() => Promise.resolve({ default: ping })),
    pong,
    nested: lazy(() => Promise.resolve({
      default: {
        ping,
        pong: lazy(() => Promise.resolve({ default: pong })),
      },
    })),
  }

  const req = { __request: true } as any
  const res = { __response: true } as any

  it('should return a 404 response if no matching procedure is found', async () => {
    const handler = new ORPCHandler(router)

    const mockRequest = new Request('https://example.com/not_found', {
      headers: new Headers({ }),
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(404)

    const body = await response?.text()
    expect(body).toContain('Not found')
  })

  it('should return a 200 response with serialized output if procedure is resolved successfully', async () => {
    const handler = new ORPCHandler(router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const mockRequest = new Request('https://example.com/ping', {
      headers: new Headers({ }),
      method: 'POST',
      body: JSON.stringify({ data: { value: '123' }, meta: [] }),
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual({ data: '__mocked__', meta: [] })

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123' }, { signal: undefined })
  })

  it('should handle deserialization errors and return a 400 response', async () => {
    const handler = new ORPCHandler(router)

    const mockRequest = new Request('https://example.com/ping', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: '{ invalid json',
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(400)

    const body = await response?.text()
    expect(body).toContain('Cannot parse request')
  })

  it('should handle unexpected errors and return a 500 response', async () => {
    const handler = new ORPCHandler(router)

    vi.mocked(createProcedureClient).mockImplementationOnce(() => {
      throw new Error('Unexpected error')
    })

    const mockRequest = new Request('https://example.com/ping', {
      headers: new Headers({ }),
      method: 'POST',
      body: JSON.stringify({ data: { value: '123' }, meta: [] }),
    })

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res)

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(500)

    const body = await response?.text()
    expect(body).toContain('Internal server error')
  })

  it('support signal', async () => {
    const handler = new ORPCHandler(router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const mockRequest = new Request('https://example.com/ping', {
      headers: new Headers({ }),
      method: 'POST',
      body: JSON.stringify({ data: { value: '123' }, meta: [] }),
    })

    const controller = new AbortController()
    const signal = controller.signal

    vi.mocked(createRequest).mockReturnValueOnce(mockRequest)

    await handler.handle(req, res, { signal })

    const response = vi.mocked(sendResponse).mock.calls![0]![1]

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual({ data: '__mocked__', meta: [] })

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123' }, { signal })
  })

  it('hooks', async () => {
    const mockRequest = new Request('https://example.com/not_found', {
      headers: new Headers({ }),
      method: 'POST',
      body: JSON.stringify({ data: { value: '123' }, meta: [] }),
    })

    const onStart = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()

    const handler = new ORPCHandler(router, {
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
    const handler = new ORPCHandler(router)

    expect(handler.condition({ headers: {} } as any)).toBe(false)
    expect(handler.condition({ headers: { [ORPC_HANDLER_HEADER]: ORPC_HANDLER_VALUE } } as any)).toBe(true)
  })

  it('should end response', async () => {
    const handler = new ORPCHandler(router)
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
    const handler = new ORPCHandler(router)
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
