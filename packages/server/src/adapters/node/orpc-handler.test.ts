import { createRequest, sendResponse } from '@mjackson/node-fetch-server'
import { describe, expect, it, vi } from 'vitest'
import { ORPCHandler as ORPCFetchHandler } from '../fetch/orpc-handler'
import { ORPCHandler } from './orpc-handler'

vi.mock('../fetch/orpc-handler', () => ({
  ORPCHandler: vi.fn(),
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
  const router = {}
  const req = { __request: true } as any
  const res = { __response: true } as any

  it('handle should works', async () => {
    const response = new Response()

    vi.mocked(ORPCFetchHandler).mockReturnValueOnce({
      handle: vi.fn().mockResolvedValue({ matched: true, response }),
    } as any)

    const handler = new ORPCHandler(router)

    await handler.handle(req, res)

    expect(createRequest).toHaveBeenCalledTimes(1)
    expect(createRequest).toHaveBeenCalledWith(req, res, undefined)

    expect(sendResponse).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith(res, response)
  })

  it('handle when matched=false', async () => {
    const response = undefined

    vi.mocked(ORPCFetchHandler).mockReturnValueOnce({
      handle: vi.fn().mockResolvedValue({ matched: false, response }),
    } as any)

    const handler = new ORPCHandler(router)

    await handler.handle(req, res)

    expect(sendResponse).toHaveBeenCalledTimes(0)
  })

  it('beforeSend hook', async () => {
    const response = new Response()

    vi.mocked(ORPCFetchHandler).mockReturnValueOnce({
      handle: vi.fn().mockResolvedValue({ matched: true, response }),
    } as any)

    const handler = new ORPCHandler(router)

    const mockBeforeSend = vi.fn()
    await handler.handle(req, res, { beforeSend: mockBeforeSend, context: { __context: true } })

    expect(mockBeforeSend).toHaveBeenCalledTimes(1)
    expect(mockBeforeSend).toHaveBeenCalledWith(response, { __context: true })
  })
})
