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
  })

  let onMessage: any
  let onClose: any

  const wss = {
    addEventListener: vi.fn((event, callback) => {
      if (event === 'message')
        onMessage = callback
      if (event === 'close')
        onClose = callback
    }),
    send: vi.fn(),
  }

  handler.upgrade(wss)

  const ping_request_message = {
    data: await encodeRequestMessage(19, MessageType.REQUEST, {
      url: new URL('orpc:/ping'),
      body: { json: 'input' },
      headers: {},
      method: 'POST',
    }),
  }

  const ping_buffer_request_message = {
    data: await encodeRequestMessage(19, MessageType.REQUEST, {
      url: new URL('orpc:/ping'),
      body: { json: 'input' },
      headers: {},
      method: 'POST',
    }),
  }

  const abort_message = {
    data: await encodeRequestMessage(19, MessageType.ABORT_SIGNAL, undefined),
  }

  const not_found_request_message = {
    data: await encodeRequestMessage(19, MessageType.REQUEST, {
      url: new URL('orpc:/not-found'),
      body: { json: 'input' },
      headers: {},
      method: 'POST',
    }),
  }

  it('on success', async () => {
    onMessage(ping_request_message)

    await vi.waitFor(() => expect(wss.send).toHaveBeenCalledTimes(1))

    const [id,, payload] = (await decodeResponseMessage(wss.send.mock.calls[0]![0]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 200,
      headers: {},
      body: { json: 'pong' },
    })
  })

  it('on success with array data', async () => {
    onMessage(ping_buffer_request_message)

    await vi.waitFor(() => expect(wss.send).toHaveBeenCalledTimes(1))
    const [id, , payload] = (await decodeResponseMessage(wss.send.mock.calls[0]![0]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 200,
      headers: {},
      body: { json: 'pong' },
    })
  })

  it('on abort signal', async () => {
    onMessage(ping_request_message)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(signal.aborted).toBe(false)
    expect(wss.send).not.toHaveBeenCalled()

    onMessage(abort_message)

    await vi.waitFor(() => expect(signal.aborted).toBe(true))
    expect(wss.send).not.toHaveBeenCalled()
  })

  it('on close', async () => {
    onMessage(ping_request_message)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(signal.aborted).toBe(false)
    expect(wss.send).not.toHaveBeenCalled()

    onClose()
    await vi.waitFor(() => expect(signal.aborted).toBe(true))
    expect(wss.send).not.toHaveBeenCalled()
  })

  it('on no procedure matched', async () => {
    onMessage(not_found_request_message)

    await vi.waitFor(() => expect(wss.send).toHaveBeenCalledTimes(1))
    const [id,, payload] = (await decodeResponseMessage(wss.send.mock.calls[0]![0]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 404,
      headers: {},
      body: 'No procedure matched',
    })
  })
})
