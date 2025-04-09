import { os } from '../../builder'
import { RPCHandler } from './rpc-handler'

describe('rpcHandler', () => {
  it('works', async () => {
    const handler = new RPCHandler(os.handler(({ input }) => ({ output: input })), {
      strictGetMethodPluginEnabled: false,
    })

    const { response } = await handler.handle(new Request('https://example.com/api/v1/?data=%7B%22json%22%3A%22value%22%7D'), {
      prefix: '/api/v1',
    })

    await expect(response?.text()).resolves.toContain('value')
    expect(response?.status).toBe(200)
  })
})
