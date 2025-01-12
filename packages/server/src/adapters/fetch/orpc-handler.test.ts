import { ContractProcedure } from '@orpc/contract'
import { describe, expect, it, vi } from 'vitest'
import { lazy } from '../../lazy'
import { Procedure } from '../../procedure'
import { createProcedureClient } from '../../procedure-client'
import { RPCHandler } from './orpc-handler'

vi.mock('../../procedure-client', () => ({
  createProcedureClient: vi.fn(() => vi.fn()),
}))

describe('rpcHandler', () => {
  const ping = new Procedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: undefined,
    }),
    handler: vi.fn(),
    postMiddlewares: [],
    preMiddlewares: [],
  })
  const pong = new Procedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: undefined,
    }),
    handler: vi.fn(),
    postMiddlewares: [],
    preMiddlewares: [],
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

  it('should return a 404 response if no matching procedure is found', async () => {
    const handler = new RPCHandler(router)

    const mockRequest = new Request('https://example.com/not_found', {
      headers: new Headers({ }),
    })

    const { matched, response } = await handler.handle(mockRequest)

    expect(matched).toBe(false)
    expect(response).toBeUndefined()
  })

  it('should return a 200 response with serialized output if procedure is resolved successfully', async () => {
    const handler = new RPCHandler(router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const mockRequest = new Request('https://example.com/ping', {
      headers: new Headers({ }),
      method: 'POST',
      body: JSON.stringify({ data: { value: '123' }, meta: [] }),
    })

    const { response, matched } = await handler.handle(mockRequest)

    expect(matched).toBe(true)

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual({ data: '__mocked__', meta: [] })

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123' }, { signal: mockRequest.signal })
  })

  it('should handle deserialization errors and return a 400 response', async () => {
    const handler = new RPCHandler(router)

    const mockRequest = new Request('https://example.com/ping', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: '{ invalid json',
    })

    const { response } = await handler.handle(mockRequest)

    expect(response?.status).toBe(400)

    const body = await response?.text()
    expect(body).toContain('Cannot parse request')
  })

  it('should handle unexpected errors and return a 500 response', async () => {
    const handler = new RPCHandler(router)

    vi.mocked(createProcedureClient).mockImplementationOnce(() => {
      throw new Error('Unexpected error')
    })

    const mockRequest = new Request('https://example.com/ping', {
      headers: new Headers({ }),
      method: 'POST',
      body: JSON.stringify({ data: { value: '123' }, meta: [] }),
    })

    const { response } = await handler.handle(mockRequest)

    expect(response?.status).toBe(500)

    const body = await response?.text()
    expect(body).toContain('Internal server error')
  })

  it('support signal', async () => {
    const handler = new RPCHandler(router)

    const caller = vi.fn().mockReturnValueOnce('__mocked__')
    vi.mocked(createProcedureClient).mockReturnValue(caller)

    const controller = new AbortController()
    const signal = controller.signal

    const mockRequest = new Request('https://example.com/ping', {
      headers: new Headers({ }),
      method: 'POST',
      body: JSON.stringify({ data: { value: '123' }, meta: [] }),
      signal,
    })

    const { response } = await handler.handle(mockRequest)

    expect(response?.status).toBe(200)

    const body = await response?.json()
    expect(body).toEqual({ data: '__mocked__', meta: [] })

    expect(caller).toBeCalledTimes(1)
    expect(caller).toBeCalledWith({ value: '123' }, { signal: mockRequest.signal })
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

    const handler = new RPCHandler(router, {
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
})
