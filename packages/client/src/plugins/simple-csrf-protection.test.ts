import { RPCHandler } from '../../../server/src/adapters/fetch/rpc-handler'
import { os } from '../../../server/src/builder'
import { SimpleCsrfProtectionHandlerPlugin } from '../../../server/src/plugins/simple-csrf-protection'
import { RPCLink } from '../adapters/fetch'
import { SimpleCsrfProtectionLinkPlugin } from './simple-csrf-protection'

describe('simpleCsrfProtectionLinkPlugin', () => {
  const handler = new RPCHandler({
    ping: os.handler(() => 'pong'),
  }, {
    plugins: [
      new SimpleCsrfProtectionHandlerPlugin(),
    ],
  })

  const link = new RPCLink({
    url: new URL('http://localhost/prefix'),
    fetch: async (request) => {
      const { response } = await handler.handle(request, { prefix: '/prefix' })

      return response ?? new Response(null, {
        status: 500,
      })
    },
    plugins: [
      new SimpleCsrfProtectionLinkPlugin(),
    ],
  })

  it('should work', async () => {
    await expect(
      link.call(['ping'], 'input', { context: {} }),
    ).resolves.toEqual('pong')
  })
})
