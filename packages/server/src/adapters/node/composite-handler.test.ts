import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ConditionalRequestHandler, RequestOptions } from './types'
import { CompositeHandler } from './composite-handler'

// Mock a basic handler implementation
function createMockHandler(
  condition: (request: IncomingMessage) => boolean,
  handle: (req: IncomingMessage, res: ServerResponse, options?: RequestOptions<any>) => Promise<void>,
): ConditionalRequestHandler<any> {
  return {
    condition,
    handle,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('compositeHandler', () => {
  const mockHandler1 = createMockHandler(
    request => Boolean(request.url?.includes('handler1')),
    vi.fn(async (req, res) => {
      res.end('Handler 1 response')
    }),
  )

  const mockHandler2 = createMockHandler(
    request => Boolean(request.url?.includes('handler2')),
    vi.fn(async (req, res) => {
      res.end('Handler 2 response')
    }),
  )

  const compositeHandler = new CompositeHandler([mockHandler1, mockHandler2])

  it('should call the fetch method of the first handler that matches the condition', async () => {
    const mockEnd = vi.fn()
    await compositeHandler.handle({ url: 'handler1' } as any, { end: mockEnd } as any, { context: {} })

    expect(mockHandler1.handle).toHaveBeenCalledTimes(1)
    expect(mockHandler2.handle).toHaveBeenCalledTimes(0)
    expect(mockEnd).toHaveBeenCalledTimes(1)
    expect(mockEnd).toHaveBeenCalledWith('Handler 1 response')
  })

  it('should return a 404 response when no handler matches the condition', async () => {
    const mockEnd = vi.fn()
    await compositeHandler.handle({ url: 'handler6' } as any, { end: mockEnd } as any, { context: {} })

    expect(mockHandler1.handle).toHaveBeenCalledTimes(0)
    expect(mockHandler2.handle).toHaveBeenCalledTimes(0)
    expect(mockEnd).toHaveBeenCalledTimes(1)
    expect(mockEnd).toHaveBeenCalledWith('None of the handlers can handle the request.')
  })

  it('should handle multiple handlers, but only call the first matching handler', async () => {
    const mockHandler1 = createMockHandler(
      request => Boolean(request.url?.includes('handler1')),
      vi.fn(async (req, res) => {
        res.end('Handler 1 response')
      }),
    )

    const mockHandler2 = createMockHandler(
      request => Boolean(request.url?.includes('handler1')),
      vi.fn(async (req, res) => {
        res.end('Handler 2 response')
      }),
    )

    const compositeHandler = new CompositeHandler([mockHandler1, mockHandler2])

    const mockEnd = vi.fn()
    await compositeHandler.handle({ url: 'handler1' } as any, { end: mockEnd } as any, { context: {} })

    expect(mockHandler1.handle).toHaveBeenCalledTimes(1)
    expect(mockHandler2.handle).toHaveBeenCalledTimes(0)
    expect(mockEnd).toHaveBeenCalledTimes(1)
    expect(mockEnd).toHaveBeenCalledWith('Handler 1 response')
  })
})
