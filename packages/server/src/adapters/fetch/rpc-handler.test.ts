import { os } from '../../builder'
import { RPCHandler } from './rpc-handler'

describe('rpcHandler', () => {
  it('works', async () => {
    const handler = new RPCHandler(os.handler(() => 'pong'))

    const { response } = await handler.handle(new Request('https://example.com/api/v1/?data=%7B%7D'), {
      prefix: '/api/v1',
    })

    await expect(response?.text()).resolves.toContain('pong')
    expect(response?.status).toBe(200)
  })
})
