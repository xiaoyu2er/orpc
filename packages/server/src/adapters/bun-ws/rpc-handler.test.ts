import { decodeResponseMessage, encodeRequestMessage, MessageType } from '@orpc/standard-server-peer'
import { os } from '../../builder'
import { experimental_RPCHandler as RPCHandler } from './rpc-handler'

describe('rpcHandler', async () => {
  let signal: AbortSignal

  beforeEach(() => {
    vi.clearAllMocks()
    signal = undefined as any
  })

  const handler = new RPCHandler({
    ping: os.handler(async ({ signal: _signal }) => {
      signal = _signal!
      await new Promise(resolve => setTimeout(resolve, 10))
      return 'pong'
    }),

    file: os.handler(async ({ signal: _signal }) => {
      signal = _signal!
      await new Promise(resolve => setTimeout(resolve, 10))
      return new Blob(['pong'])
    }),
  })

  const wss = {
    send: vi.fn(),
  }

  const ping_request_message = await encodeRequestMessage(19, MessageType.REQUEST, {
    url: new URL('orpc:/ping'),
    body: { json: 'input' },
    headers: {},
    method: 'POST',
  }) as string

  const file_request_message = {
    buffer: new TextEncoder().encode(await encodeRequestMessage(19, MessageType.REQUEST, {
      url: new URL('orpc:/file'),
      body: { json: 'input' },
      headers: {},
      method: 'POST',
    }) as string),
  }

  const not_found_request_message = await encodeRequestMessage(19, MessageType.REQUEST, {
    url: new URL('orpc:/not-found'),
    body: { json: 'input' },
    headers: {},
    method: 'POST',
  }) as string

  const abort_message = await encodeRequestMessage(19, MessageType.ABORT_SIGNAL, undefined) as string

  it('on success', async () => {
    handler.message(wss, ping_request_message)

    await new Promise(resolve => setTimeout(resolve, 20))

    const [id,, payload] = (await decodeResponseMessage(wss.send.mock.calls[0]![0]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 200,
      headers: {},
      body: { json: 'pong' },
    })
  })

  it('on success with buffer data', async () => {
    handler.message(wss, file_request_message)

    await new Promise(resolve => setTimeout(resolve, 20))

    const [id, , payload] = (await decodeResponseMessage(wss.send.mock.calls[0]![0]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 200,
      headers: {
        'content-type': expect.any(String),
      },
      body: expect.any(FormData),
    })

    expect(await (payload as any).body.get('0').text()).toBe('pong')
  })

  it('on abort signal', async () => {
    handler.message(wss, ping_request_message)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(signal.aborted).toBe(false)
    expect(wss.send).not.toHaveBeenCalled()

    handler.message(wss, abort_message)

    await new Promise(resolve => setTimeout(resolve, 20))

    expect(signal.aborted).toBe(true)
    expect(wss.send).not.toHaveBeenCalled()
  })

  it('on close', async () => {
    handler.message(wss, ping_request_message)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(signal.aborted).toBe(false)
    expect(wss.send).not.toHaveBeenCalled()

    handler.close(wss)
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(signal.aborted).toBe(true)
    expect(wss.send).not.toHaveBeenCalled()
  })

  it('on no procedure matched', async () => {
    handler.message(wss, not_found_request_message)

    await new Promise(resolve => setTimeout(resolve, 0))

    const [id,, payload] = (await decodeResponseMessage(wss.send.mock.calls[0]![0]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 404,
      headers: {},
      body: 'No procedure matched',
    })
  })
})
