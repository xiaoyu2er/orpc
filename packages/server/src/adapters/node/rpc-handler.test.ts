import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import { os } from '../../builder'
import { RPCHandler } from './rpc-handler'

describe('rpcHandler', () => {
  it('works', async () => {
    const handler = new RPCHandler(os.handler(() => 'pong'), {
      strictGetMethodPluginEnabled: false,
    })

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      await handler.handle(req, res)
    }).get('/?data=%7B%7D')

    expect(res.text).toContain('pong')
    expect(res.status).toBe(200)
  })
})
