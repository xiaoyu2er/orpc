import { StandardRPCLink } from '@orpc/client/standard'
import { os } from '@orpc/server'
import { StandardRPCHandler } from '@orpc/server/standard'
import { isAsyncIteratorObject } from '@orpc/shared'
import { decodeRequestMessage, encodeResponseMessage, MessageType } from '@orpc/standard-server-peer'
import { WebSocket as ReconnectableWebSocket } from 'partysocket'
import { DurableIteratorError } from '../error'
import { DurableIterator } from '../iterator'
import { DurableIteratorHandlerPlugin } from '../plugin'
import { DurableIteratorLinkPlugin } from './plugin'

vi.mock('partysocket', () => {
  return {
    WebSocket: vi.fn(() => ({
      readyState: 1, // OPEN
      addEventListener: vi.fn(),
      send: vi.fn(),
    })),
  }
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe('durableIteratorLinkPlugin', async () => {
  const interceptor = vi.fn(({ next }) => next())

  const handler = new StandardRPCHandler({
    durableIterator: os.handler(() => new DurableIterator<any, any>('some-room', 'signing-key').rpc('getUser', 'sendMessage')),
    regularResponse: os.handler(() => 'regular response'),
  }, {
    plugins: [
      new DurableIteratorHandlerPlugin(),
    ],
  })

  const link = new StandardRPCLink({
    async call(request) {
      const result = await handler.handle({ ...request, body: () => Promise.resolve(request.body) }, {
        context: {},
      })

      const response = result.response!

      return { ...response, body: () => Promise.resolve(response.body) }
    },
  }, {
    url: 'http://localhost',
    clientInterceptors: [interceptor],
    plugins: [
      new DurableIteratorLinkPlugin({
        url: 'ws://localhost',
      }),
    ],
  })

  it('should do nothing if not a durable event iterator response', async () => {
    const output = await link.call(['regularResponse'], {}, {
      context: {},
    })

    expect(output).toEqual('regular response')
  })

  it('should throw error if plugin context is corrupted', async () => {
    interceptor.mockImplementationOnce(({ next, ...options }) => next({ ...options, context: {} }))

    await expect(link.call(['regularResponse'], {}, { context: {} })).rejects.toThrow(
      new DurableIteratorError('Plugin context has been corrupted or modified by another plugin or interceptor'),
    )
  })

  describe('durable iterator', () => {
    it('works', async () => {
      const outputPromise = link.call(['durableIterator'], {}, { context: {} }) as any

      await vi.waitFor(async () => {
        expect(ReconnectableWebSocket).toHaveBeenCalledOnce()
        const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
        const [id] = await decodeRequestMessage(ws.send.mock.calls[0][0])

        const [, onMessage] = vi.mocked(ws.addEventListener).mock.calls.find(([event]: any[]) => event === 'message') as any

        onMessage({
          data: await encodeResponseMessage(id, MessageType.RESPONSE, {
            body: (async function* () {}()),
            status: 200,
            headers: {},
          }),
        })
      })

      const output = await outputPromise
      expect(output).toSatisfy(isAsyncIteratorObject)

      expect(output.getUser).toBeInstanceOf(Function)
      expect(output.sendMessage).toBeInstanceOf(Function)
      expect(output.random).not.toBeDefined()

      // RPC

      const userPromise = output.getUser()

      await vi.waitFor(async () => {
        expect(ReconnectableWebSocket).toHaveBeenCalledOnce()
        const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
        const [id] = await decodeRequestMessage(ws.send.mock.calls[1][0])

        const [, onMessage] = vi.mocked(ws.addEventListener).mock.calls.find(([event]: any[]) => event === 'message') as any

        onMessage({
          data: await encodeResponseMessage(id, MessageType.RESPONSE, {
            body: { json: 'user' },
            status: 200,
            headers: {},
          }),
        })
      })

      const user = await userPromise
      expect(user).toEqual('user')
    })
  })
})
