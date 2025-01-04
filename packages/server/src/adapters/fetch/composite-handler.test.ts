import type { ConditionalFetchHandler, FetchOptions } from './types'
import { CompositeHandler } from './composite-handler'

// Mock a basic handler implementation
function createMockHandler(
  condition: (request: Request) => boolean,
  fetch: (request: Request, options?: FetchOptions<any, any>) => Promise<Response>,
): ConditionalFetchHandler<any> {
  return {
    condition,
    fetch,
  }
}

describe('compositeHandler', () => {
  it('should call the fetch method of the first handler that matches the condition', async () => {
    const mockHandler1 = createMockHandler(
      request => request.url.includes('handler1'),
      vi.fn(() => Promise.resolve(new Response('Handler 1 response'))),
    )

    const mockHandler2 = createMockHandler(
      request => request.url.includes('handler2'),
      vi.fn(() => Promise.resolve(new Response('Handler 2 response'))),
    )

    const compositeHandler = new CompositeHandler([mockHandler1, mockHandler2])

    const request = new Request('https://example.com/handler1')
    const response = await compositeHandler.fetch(request)

    expect(mockHandler1.fetch).toHaveBeenCalledTimes(1)
    expect(mockHandler2.fetch).toHaveBeenCalledTimes(0)
    expect(await response.text()).toBe('Handler 1 response')
  })

  it('should return a 404 response when no handler matches the condition', async () => {
    const mockHandler1 = createMockHandler(
      request => request.url.includes('handler1'),
      vi.fn(() => Promise.resolve(new Response('Handler 1 response'))),
    )

    const mockHandler2 = createMockHandler(
      request => request.url.includes('handler2'),
      vi.fn(() => Promise.resolve(new Response('Handler 2 response'))),
    )

    const compositeHandler = new CompositeHandler([mockHandler1, mockHandler2])

    const request = new Request('https://example.com/unknown')
    const response = await compositeHandler.fetch(request)

    expect(mockHandler1.fetch).toHaveBeenCalledTimes(0)
    expect(mockHandler2.fetch).toHaveBeenCalledTimes(0)
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('None of the handlers can handle the request.')
  })

  it('should handle an empty handlers array', async () => {
    const compositeHandler = new CompositeHandler([])

    const request = new Request('https://example.com/unknown')
    const response = await compositeHandler.fetch(request)

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('None of the handlers can handle the request.')
  })

  it('should handle multiple handlers, but only call the first matching handler', async () => {
    const mockHandler1 = createMockHandler(
      request => request.url.includes('handler1'),
      vi.fn(() => Promise.resolve(new Response('Handler 1 response'))),
    )

    const mockHandler2 = createMockHandler(
      request => request.url.includes('handler1'),
      vi.fn(() => Promise.resolve(new Response('Handler 2 response'))),
    )

    const compositeHandler = new CompositeHandler([mockHandler1, mockHandler2])

    const request = new Request('https://example.com/handler1')
    const response = await compositeHandler.fetch(request)

    expect(mockHandler1.fetch).toHaveBeenCalledTimes(1)
    expect(mockHandler2.fetch).toHaveBeenCalledTimes(0)
    expect(await response.text()).toBe('Handler 1 response')
  })
})
