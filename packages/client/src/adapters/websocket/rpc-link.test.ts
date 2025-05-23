import { decodeRequestMessage, encodeResponseMessage, MessageType } from '@orpc/standard-server-peer'
import { createORPCClient } from '../../client'
import { experimental_RPCLink as RPCLink } from './rpc-link'

describe('rpcLink', () => {
  let onMessage: any
  let onClose: any

  const websocket = {
    addEventListener: vi.fn((event, callback) => {
      if (event === 'message')
        onMessage = callback
      if (event === 'close')
        onClose = callback
    }),
    send: vi.fn(),
  }

  const link = new RPCLink({
    websocket,
  })

  const orpc = createORPCClient(link) as any

  it('on success', async () => {
    expect(orpc.ping('input')).resolves.toEqual('pong')

    await vi.waitFor(() => expect(websocket.send).toHaveBeenCalledTimes(1))

    const [id,, payload] = (await decodeRequestMessage(websocket.send.mock.calls[0]![0]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      url: new URL('orpc:/ping'),
      body: { json: 'input' },
      headers: {},
      method: 'POST',
    })

    onMessage({ data: await encodeResponseMessage(id, MessageType.RESPONSE, { body: { json: 'pong' }, status: 200, headers: {} }) })
  })

  it('on close', async () => {
    expect(orpc.ping('input')).rejects.toThrow(/aborted/)

    await new Promise(resolve => setTimeout(resolve, 0))

    onClose()
  })
})
