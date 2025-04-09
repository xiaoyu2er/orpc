import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import { os } from '../../builder'
import { RPCHandler } from './rpc-handler'

describe('rpcHandler', () => {
  it('works', async () => {
    const handler = new RPCHandler(os.handler(({ input }) => ({ output: input })), {
      strictGetMethodPluginEnabled: false,
    })

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      await handler.handle(req, res)
    }).get('/?data=%7B%22json%22%3A%22value%22%7D')

    expect(res.text).toContain('value')
    expect(res.status).toBe(200)
  })
})
