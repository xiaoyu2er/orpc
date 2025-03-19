import type { RouterClient } from '../../../server/src/router-client'
import type { RetryPluginContext } from './retry'
import { RPCHandler } from '../../../server/src/adapters/fetch/rpc-handler'
import { os } from '../../../server/src/builder'
import { RPCLink } from '../adapters/fetch'
import { createORPCClient } from '../client'
import { ORPCError } from '../error'
import { RetryPlugin } from './retry'

interface ORPCClientContext extends RetryPluginContext {

}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('retryPlugin', () => {
  const handlerFn = vi.fn()

  const router = os.handler(handlerFn)

  const handler = new RPCHandler(router)

  const link = new RPCLink<ORPCClientContext>({
    url: 'http://localhost:3000',
    fetch: async (request) => {
      const { response } = await handler.handle(request)
      return response ?? new Response('fail', { status: 500 })
    },
    plugins: [
      new RetryPlugin(),
    ],
  })

  const client: RouterClient<typeof router, ORPCClientContext> = createORPCClient(link)

  it('should not retry by default', async () => {
    handlerFn.mockRejectedValueOnce(new Error('fail'))

    await expect(client('hello')).rejects.toThrow('Internal server error')

    expect(handlerFn).toHaveBeenCalledTimes(1)
  })

  it('should retry', async () => {
    handlerFn.mockRejectedValue(new Error('fail'))

    await expect(client('hello', { context: { retry: 3, retryDelay: 0 } })).rejects.toThrow('Internal server error')

    expect(handlerFn).toHaveBeenCalledTimes(4)
  })

  it('should retry with delay', { retry: 5 }, async () => {
    handlerFn.mockRejectedValue(new Error('fail'))

    const start = Date.now()
    await expect(client('hello', { context: { retry: 4, retryDelay: 50 } })).rejects.toThrow('Internal server error')

    expect(Date.now() - start).toBeGreaterThanOrEqual(200)
    expect(Date.now() - start).toBeLessThanOrEqual(249)

    expect(handlerFn).toHaveBeenCalledTimes(5)
  })

  it('should not retry if shouldRetry=false', { retry: 5 }, async () => {
    handlerFn.mockRejectedValue(new Error('fail'))

    let times = 0
    const shouldRetry = vi.fn(() => {
      times++

      return times < 2
    })

    await expect(client('hello', { context: { retry: 3, shouldRetry, retryDelay: 0 } })).rejects.toThrow('Internal server error')

    expect(handlerFn).toHaveBeenCalledTimes(2)

    expect(shouldRetry).toHaveBeenCalledTimes(2)
    expect(shouldRetry).toHaveBeenNthCalledWith(
      1,
      { attemptIndex: 0, error: expect.any(ORPCError) },
      expect.objectContaining({ context: { retry: 3, shouldRetry, retryDelay: 0 } }),
      [],
      'hello',
    )
    expect(shouldRetry).toHaveBeenNthCalledWith(
      2,
      { attemptIndex: 1, error: expect.any(ORPCError) },
      expect.objectContaining({ context: { retry: 3, shouldRetry, retryDelay: 0 } }),
      [],
      'hello',
    )
  })

  it('onRetry', async () => {
    handlerFn.mockRejectedValue(new Error('fail'))

    const clean = vi.fn()
    const onRetry = vi.fn(() => clean)

    await expect(client('hello', { context: { retry: 3, retryDelay: 0, onRetry } })).rejects.toThrow('Internal server error')

    expect(handlerFn).toHaveBeenCalledTimes(4)

    expect(onRetry).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenNthCalledWith(
      1,
      { attemptIndex: 0, error: expect.any(ORPCError) },
      expect.objectContaining({ context: { retry: 3, retryDelay: 0, onRetry } }),
      [],
      'hello',
    )
    expect(onRetry).toHaveBeenNthCalledWith(
      2,
      { attemptIndex: 1, error: expect.any(ORPCError) },
      expect.objectContaining({ context: { retry: 3, retryDelay: 0, onRetry } }),
      [],
      'hello',
    )
    expect(onRetry).toHaveBeenNthCalledWith(
      3,
      { attemptIndex: 2, error: expect.any(ORPCError) },
      expect.objectContaining({ context: { retry: 3, retryDelay: 0, onRetry } }),
      [],
      'hello',
    )

    expect(clean).toHaveBeenCalledTimes(3)
    expect(clean).toHaveBeenNthCalledWith(1, { success: false })
    expect(clean).toHaveBeenNthCalledWith(2, { success: false })
    expect(clean).toHaveBeenNthCalledWith(3, { success: false })
  })

  it('should not retry if signal aborted', async () => {
    handlerFn.mockRejectedValue(new Error('fail'))

    const controller = new AbortController()

    controller.abort()

    await expect(client('hello', { context: { retry: 3, retryDelay: 0 }, signal: controller.signal })).rejects.toThrow('Internal server error')

    expect(handlerFn).toHaveBeenCalledTimes(1)
  })
})
