import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import { os } from '../../builder'
import { RPCHandler as NodeRPChandler } from '../node/rpc-handler'
import { BodySizeLimitPlugin } from './body-size-limit-plugin'
import { RPCHandler } from './rpc-handler'

describe('bodySizeLimitPlugin', () => {
  const size22Json = { json: { foo: 'bar' } }

  it('should work if body size is not exceeded', async () => {
    const handler = new RPCHandler(os.handler(() => 'ping'), {
      plugins: [
        new BodySizeLimitPlugin({ maxBodySize: 22 }),
      ],
    })

    const { response } = await handler.handle(new Request('https://example.com/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(size22Json),
    }))

    await expect(response?.text()).resolves.toContain('ping')
    expect(response?.status).toBe(200)
  })

  it('check the content-length', async () => {
    const handler = new RPCHandler(os.handler(() => 'ping'), {
      plugins: [
        new BodySizeLimitPlugin({ maxBodySize: 21 }),
      ],
    })
    const { response } = await handler.handle(new Request('https://example.com', {
      method: 'POST',
      headers: {
        'content-length': '22',
      },
      body: JSON.stringify({}),
    }))

    await expect(response?.text()).resolves.toContain('PAYLOAD_TOO_LARGE')
    expect(response?.status).toBe(413)
  })

  it('check the body-size', async () => {
    const handler = new RPCHandler(os.handler(() => 'ping'), {
      plugins: [
        new BodySizeLimitPlugin({ maxBodySize: 21 }),
      ],
    })

    const { response } = await handler.handle(new Request('https://example.com/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(size22Json),
    }))

    await expect(response?.text()).resolves.toContain('PAYLOAD_TOO_LARGE')
    expect(response?.status).toBe(413)
  })

  it('should throw if used outside of node adapter', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new NodeRPChandler(os.handler(() => 'ping'), {
        plugins: [
          new BodySizeLimitPlugin({ maxBodySize: 22 }),
        ],
      })

      await handler.handle(req, res)
    })
      .post('/')
      .send(size22Json)

    expect(res.text).toContain('INTERNAL_SERVER_ERROR')
    expect(res.status).toBe(500)
  })
})
