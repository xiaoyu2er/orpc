import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import { os } from '../../builder'
import * as StandardModule from '../standard'

import { RPCHandler } from './rpc-handler'

const initDefaultStandardRPCHandlerOptionsSpy = vi.spyOn(StandardModule, 'initDefaultStandardRPCHandlerOptions')

describe('rpcHandler', () => {
  it('works', async () => {
    const handler = new RPCHandler(os.handler(() => 'pong'))

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      await handler.handle(req, res)
    }).get('/?data=%7B%7D')

    expect(res.text).toContain('pong')
    expect(res.status).toBe(200)
  })

  it('should initDefaultStandardRPCHandlerOptions', async () => {
    const options = { strictGetMethodPluginEnabled: true }
    const handler = new RPCHandler(os.handler(() => 'pong'), options)

    expect(initDefaultStandardRPCHandlerOptionsSpy).toHaveBeenCalledWith(options)
  })
})
