import { createRequest, sendResponse } from '@orpc/server/node'
import { OpenAPIHandler as OpenAPIFetchHandler } from '../fetch/openapi-handler'
import { OpenAPIHandler } from './openapi-handler'

vi.mock('../fetch/openapi-handler', () => ({
  OpenAPIHandler: vi.fn(),
}))

vi.mock('@orpc/server/node', async origin => ({
  ...await origin(),
  createRequest: vi.fn(),
  sendResponse: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('openAPIHandler', () => {
  const hono = {} as any
  const router = {}
  const req = { __request: true } as any
  const res = { __response: true } as any

  it('handle should works', async () => {
    const response = new Response()

    vi.mocked(OpenAPIFetchHandler).mockReturnValueOnce({
      handle: vi.fn().mockResolvedValue({ matched: true, response }),
    } as any)

    const handler = new OpenAPIHandler(hono, router)

    await handler.handle(req, res)

    expect(createRequest).toHaveBeenCalledTimes(1)
    expect(createRequest).toHaveBeenCalledWith(req, res)

    expect(sendResponse).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith(res, response)
  })

  it('handle when matched=false', async () => {
    const response = undefined

    vi.mocked(OpenAPIFetchHandler).mockReturnValueOnce({
      handle: vi.fn().mockResolvedValue({ matched: false, response }),
    } as any)

    const handler = new OpenAPIHandler(hono, router)

    await handler.handle(req, res)

    expect(sendResponse).toHaveBeenCalledTimes(0)
  })

  it('beforeSend hook', async () => {
    const response = new Response()

    vi.mocked(OpenAPIFetchHandler).mockReturnValueOnce({
      handle: vi.fn().mockResolvedValue({ matched: true, response }),
    } as any)

    const handler = new OpenAPIHandler(hono, router)

    const mockBeforeSend = vi.fn()
    await handler.handle(req, res, { beforeSend: mockBeforeSend, context: { __context: true } })

    expect(mockBeforeSend).toHaveBeenCalledTimes(1)
    expect(mockBeforeSend).toHaveBeenCalledWith(response, { __context: true })
  })
})
