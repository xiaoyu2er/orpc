import { StandardRPCLink } from '@orpc/client/standard'
import { os } from '@orpc/server'
import { StandardRPCHandler } from '@orpc/server/standard'
import { isAsyncIteratorObject, sleep } from '@orpc/shared'
import { decodeRequestMessage, encodeResponseMessage, MessageType } from '@orpc/standard-server-peer'
import { WebSocket as ReconnectableWebSocket } from 'partysocket'
import { DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { DurableIteratorError } from '../error'
import { DurableIterator } from '../iterator'
import { DurableIteratorHandlerPlugin } from '../plugin'
import { parseDurableIteratorToken } from '../schemas'
import { DurableIteratorLinkPlugin } from './plugin'

vi.mock('partysocket', () => {
  return {
    WebSocket: vi.fn(() => ({
      readyState: 1, // OPEN
      addEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    })),
  }
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe('durableIteratorLinkPlugin', async () => {
  const interceptor = vi.fn(({ next }) => next())
  const durableIteratorHandler = vi.fn(() => new DurableIterator<any, any>('some-room', 'signing-key').rpc('getUser', 'sendMessage'))
  const shouldRefreshTokenOnExpire = vi.fn(() => false)

  const handler = new StandardRPCHandler({
    durableIterator: os.handler(durableIteratorHandler),
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
        shouldRefreshTokenOnExpire,
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

  it('should resolve durable iterator', async () => {
    const outputPromise = link.call(['durableIterator'], {}, { context: {} }) as any

    await vi.waitFor(async () => {
      expect(ReconnectableWebSocket).toHaveBeenCalledOnce()
      const urlProvider = vi.mocked(ReconnectableWebSocket).mock.calls[0]![0] as any
      const url = new URL(await urlProvider())

      expect(url.toString().startsWith('ws://localhost/?token=')).toBe(true)
      expect(parseDurableIteratorToken(url.searchParams.get(DURABLE_ITERATOR_TOKEN_PARAM)!)).toBeTypeOf('object')

      const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
      const [id] = await decodeRequestMessage(ws.send.mock.calls[0][0])

      const [, onMessage] = vi.mocked(ws.addEventListener).mock.calls.find(([event]: any[]) => event === 'message') as any

      onMessage({
        data: await encodeResponseMessage(id, MessageType.RESPONSE, {
          body: (async function* () { }()),
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

  describe('refresh expired token', () => {
    it('works', async () => {
      shouldRefreshTokenOnExpire.mockImplementation(() => true)
      durableIteratorHandler.mockImplementation(
        () => new DurableIterator<any, any>('some-room', 'signing-key', {
          tokenTTLSeconds: 1,
        }) as any,
      )

      const outputPromise = link.call(['durableIterator'], {}, { context: {} }) as any

      await vi.waitFor(async () => {
        expect(ReconnectableWebSocket).toHaveBeenCalledOnce()

        const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
        const [id] = await decodeRequestMessage(ws.send.mock.calls[0][0])

        const [, onMessage] = vi.mocked(ws.addEventListener).mock.calls.find(([event]: any[]) => event === 'message') as any

        onMessage({
          data: await encodeResponseMessage(id, MessageType.RESPONSE, {
            body: (async function* () { }()),
            status: 200,
            headers: {},
          }),
        })
      })

      const output = await outputPromise
      expect(output).toSatisfy(isAsyncIteratorObject)

      const urlProvider = vi.mocked(ReconnectableWebSocket).mock.calls[0]![0] as any

      const url1 = await urlProvider()
      expect(durableIteratorHandler).toHaveBeenCalledTimes(1)
      expect(await urlProvider()).toEqual(url1)
      expect(durableIteratorHandler).toHaveBeenCalledTimes(1) // not expired yet

      await sleep(1000)
      const url2 = await urlProvider()
      expect(url1).not.toEqual(url2)
      expect(durableIteratorHandler).toHaveBeenCalledTimes(2)

      expect(shouldRefreshTokenOnExpire).toHaveBeenCalledTimes(1)
      expect(shouldRefreshTokenOnExpire).toHaveBeenCalledWith(
        parseDurableIteratorToken(new URL(url1).searchParams.get(DURABLE_ITERATOR_TOKEN_PARAM)!),
        expect.objectContaining({ path: ['durableIterator'] }),
      )
    })

    it('not refresh if shouldRefreshTokenOnExpire returns false', async () => {
      shouldRefreshTokenOnExpire.mockImplementation(() => false)
      durableIteratorHandler.mockImplementation(
        () => new DurableIterator<any, any>('some-room', 'signing-key', {
          tokenTTLSeconds: 1,
        }) as any,
      )

      const outputPromise = link.call(['durableIterator'], {}, { context: {} }) as any

      await vi.waitFor(async () => {
        expect(ReconnectableWebSocket).toHaveBeenCalledOnce()

        const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
        const [id] = await decodeRequestMessage(ws.send.mock.calls[0][0])

        const [, onMessage] = vi.mocked(ws.addEventListener).mock.calls.find(([event]: any[]) => event === 'message') as any

        onMessage({
          data: await encodeResponseMessage(id, MessageType.RESPONSE, {
            body: (async function* () { }()),
            status: 200,
            headers: {},
          }),
        })
      })

      const output = await outputPromise
      expect(output).toSatisfy(isAsyncIteratorObject)

      const urlProvider = vi.mocked(ReconnectableWebSocket).mock.calls[0]![0] as any

      const url1 = await urlProvider()
      expect(durableIteratorHandler).toHaveBeenCalledTimes(1)
      expect(await urlProvider()).toEqual(url1)
      expect(durableIteratorHandler).toHaveBeenCalledTimes(1) // not expired yet

      await sleep(1000)
      const url2 = await urlProvider()
      expect(url1).toEqual(url2)
      expect(durableIteratorHandler).toHaveBeenCalledTimes(1) // no refresh happened

      expect(shouldRefreshTokenOnExpire).toHaveBeenCalledTimes(1)
      expect(shouldRefreshTokenOnExpire).toHaveBeenCalledWith(
        parseDurableIteratorToken(new URL(url1).searchParams.get(DURABLE_ITERATOR_TOKEN_PARAM)!),
        expect.objectContaining({ path: ['durableIterator'] }),
      )
    })

    it('if refresh token is invalid', async () => {
      shouldRefreshTokenOnExpire.mockImplementation(() => true)
      durableIteratorHandler.mockImplementationOnce(
        () => new DurableIterator<any, any>('some-room', 'signing-key', {
          tokenTTLSeconds: 1,
        }) as any,
      )

      const outputPromise = link.call(['durableIterator'], {}, { context: {} }) as any

      await vi.waitFor(async () => {
        expect(ReconnectableWebSocket).toHaveBeenCalledOnce()

        const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
        const [id] = await decodeRequestMessage(ws.send.mock.calls[0][0])

        const [, onMessage] = vi.mocked(ws.addEventListener).mock.calls.find(([event]: any[]) => event === 'message') as any

        onMessage({
          data: await encodeResponseMessage(id, MessageType.RESPONSE, {
            body: (async function* () { }()),
            status: 200,
            headers: {},
          }),
        })
      })

      const output = await outputPromise
      expect(output).toSatisfy(isAsyncIteratorObject)

      const urlProvider = vi.mocked(ReconnectableWebSocket).mock.calls[0]![0] as any

      await urlProvider()
      expect(durableIteratorHandler).toHaveBeenCalledTimes(1)

      await sleep(1000)
      durableIteratorHandler.mockResolvedValueOnce('invalid-token' as any)
      await expect(urlProvider()).rejects.toThrow('Expected valid token for procedure')
      expect(durableIteratorHandler).toHaveBeenCalledTimes(2)

      await sleep(1000)
      durableIteratorHandler.mockResolvedValueOnce({} as any)
      await expect(urlProvider()).rejects.toThrow('Expected valid token for procedure')
      expect(durableIteratorHandler).toHaveBeenCalledTimes(3)
    })
  })

  it('throw right away if signal is aborted before establishing websocket connection', async () => {
    const controller = new AbortController()
    const signal = controller.signal

    durableIteratorHandler.mockImplementationOnce(
      () => {
        controller.abort() // abort during fetch token before connection is established
        return new DurableIterator<any, any>('some-room', 'signing-key') as any
      },
    )

    await expect(link.call(['durableIterator'], {}, { context: {}, signal })).rejects.toThrow(signal.reason)
  })

  it('cancel websocket if signal is aborted', async () => {
    const controller = new AbortController()
    const signal = controller.signal

    const outputPromise = link.call(['durableIterator'], {}, { context: {}, signal }) as any

    await vi.waitFor(async () => {
      const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
      const [id] = await decodeRequestMessage(ws.send.mock.calls[0][0])

      const [, onMessage] = vi.mocked(ws.addEventListener).mock.calls.find(([event]: any[]) => event === 'message') as any

      onMessage({
        data: await encodeResponseMessage(id, MessageType.RESPONSE, {
          body: (async function* () { }()),
          status: 200,
          headers: {},
        }),
      })
    })

    await outputPromise

    const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
    controller.abort()
    expect(ws.close).toHaveBeenCalledTimes(1)
  })

  it('cancel websocket if iterator return is called', async () => {
    const controller = new AbortController()
    const signal = controller.signal
    const removeEventListenerSpy = vi.spyOn(signal, 'removeEventListener')

    const outputPromise = link.call(['durableIterator'], {}, { context: {}, signal }) as any

    await vi.waitFor(async () => {
      const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
      const [id] = await decodeRequestMessage(ws.send.mock.calls[0][0])

      const [, onMessage] = vi.mocked(ws.addEventListener).mock.calls.find(([event]: any[]) => event === 'message') as any

      onMessage({
        data: await encodeResponseMessage(id, MessageType.RESPONSE, {
          body: (async function* () { }()),
          status: 200,
          headers: {},
        }),
      })
    })

    const output = await outputPromise as any

    await output.return()

    const ws = vi.mocked(ReconnectableWebSocket).mock.results[0]!.value
    expect(ws.close).toHaveBeenCalledTimes(1)

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function)) // ensure it cleanups the event listener
  })
})
