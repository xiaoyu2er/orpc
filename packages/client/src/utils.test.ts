import type { ClientContext, ClientLink } from './types'
import { createORPCClient } from './client'
import { ORPCError } from './error'
import { createSafeClient, resolveFriendlyClientOptions, safe } from './utils'

it('safe', async () => {
  const r1 = await safe(Promise.resolve(1))
  expect([...r1]).toEqual([null, 1, false, true])
  expect({ ...r1 }).toEqual(expect.objectContaining({ error: null, data: 1, isDefined: false, isSuccess: true }))

  const e2 = new Error('error')
  const r2 = await safe(Promise.reject(e2))
  expect([...r2]).toEqual([e2, undefined, false, false])
  expect({ ...r2 }).toEqual(expect.objectContaining({ error: e2, data: undefined, isDefined: false, isSuccess: false }))

  const e3 = new ORPCError('BAD_GATEWAY', { defined: true })
  const r3 = await safe(Promise.reject(e3))
  expect([...r3]).toEqual([e3, undefined, true, false])
  expect({ ...r3 }).toEqual(expect.objectContaining({ error: e3, data: undefined, isDefined: true, isSuccess: false }))

  const e4 = new ORPCError('BAD_GATEWAY')
  const r4 = await safe(Promise.reject(e4))
  expect([...r4]).toEqual([e4, undefined, false, false])
  expect({ ...r4 }).toEqual(expect.objectContaining({ error: e4, data: undefined, isDefined: false, isSuccess: false }))
})

it('resolveFriendlyClientOptions', () => {
  expect(resolveFriendlyClientOptions({})).toEqual({ context: {} })
  expect(resolveFriendlyClientOptions({ context: { a: 1 } })).toEqual({ context: { a: 1 } })
  expect(resolveFriendlyClientOptions({ lastEventId: '123' })).toEqual({ context: {}, lastEventId: '123' })
})

describe('createSafeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should wrap procedure calls with safe function', async () => {
    const mockSuccessValue = { result: 'success' }
    const mockedLink: ClientLink<ClientContext> = {
      call: vi.fn().mockResolvedValue(mockSuccessValue),
    }

    const client = createORPCClient(mockedLink) as any
    const safeClient = createSafeClient(client)

    const result = await safeClient.ping({ value: 'hello' })

    expect(result.error).toBeNull()
    expect(result.data).toEqual(mockSuccessValue)
    expect(result.isDefined).toBe(false)
    expect(result.isSuccess).toBe(true)
    expect([...result]).toEqual([null, mockSuccessValue, false, true])
    expect(mockedLink.call).toBeCalledTimes(1)
    expect(mockedLink.call).toBeCalledWith(['ping'], { value: 'hello' }, { context: {} })
  })

  it('should handle errors with safe function for undefined errors', async () => {
    const mockError = new Error('test error')
    const mockedLink: ClientLink<ClientContext> = {
      call: vi.fn().mockRejectedValue(mockError),
    }

    const client = createORPCClient(mockedLink) as any
    const safeClient = createSafeClient(client)

    const result = await safeClient.ping({ value: 'hello' })

    expect(result.error).toBe(mockError)
    expect(result.data).toBeUndefined()
    expect(result.isDefined).toBe(false)
    expect(result.isSuccess).toBe(false)
    expect([...result]).toEqual([mockError, undefined, false, false])
  })

  it('should handle defined ORPCError with safe function', async () => {
    const mockError = new ORPCError('BAD_GATEWAY', { defined: true })
    const mockedLink: ClientLink<ClientContext> = {
      call: vi.fn().mockRejectedValue(mockError),
    }

    const client = createORPCClient(mockedLink) as any
    const safeClient = createSafeClient(client)

    const result = await safeClient.ping({ value: 'hello' })

    expect(result.error).toBe(mockError)
    expect(result.data).toBeUndefined()
    expect(result.isDefined).toBe(true)
    expect(result.isSuccess).toBe(false)
    expect([...result]).toEqual([mockError, undefined, true, false])
  })

  it('should work with nested procedure calls', async () => {
    const mockSuccessValue = { result: 'nested success' }
    const mockedLink: ClientLink<ClientContext> = {
      call: vi.fn().mockResolvedValue(mockSuccessValue),
    }

    const client = createORPCClient(mockedLink) as any
    const safeClient = createSafeClient(client)

    const result = await safeClient.nested.pong({ value: 'hello' })

    expect(result.error).toBeNull()
    expect(result.data).toEqual(mockSuccessValue)
    expect(result.isDefined).toBe(false)
    expect(result.isSuccess).toBe(true)
    expect(mockedLink.call).toBeCalledTimes(1)
    expect(mockedLink.call).toBeCalledWith(['nested', 'pong'], { value: 'hello' }, { context: {} })
  })

  it('should work with client options (signal, context)', async () => {
    const mockSuccessValue = { result: 'success with context' }
    const mockedLink: ClientLink<ClientContext> = {
      call: vi.fn().mockResolvedValue(mockSuccessValue),
    }

    const client = createORPCClient(mockedLink) as any
    const safeClient = createSafeClient(client)

    const controller = new AbortController()
    const signal = controller.signal

    const result = await safeClient.ping({ value: 'hello' }, { signal, context: { userId: '123' } })

    expect(result.error).toBeNull()
    expect(result.data).toEqual(mockSuccessValue)
    expect(mockedLink.call).toBeCalledTimes(1)
    expect(mockedLink.call).toBeCalledWith(['ping'], { value: 'hello' }, { signal, context: { userId: '123' } })
  })
})
