import type { IncomingMessage, ServerResponse } from 'node:http'
import { os } from '@orpc/server'
import request from 'supertest'
import { OpenAPIHandler } from './openapi-handler'

describe('openAPIHandler', () => {
  it('works', async () => {
    const handler = new OpenAPIHandler(os.route({ method: 'GET' }).handler(() => 'pong'))

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      await handler.handle(req, res)
    }).get('/')

    expect(res.text).toContain('pong')
    expect(res.status).toBe(200)
  })
})
