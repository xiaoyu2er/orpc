import { os } from '@orpc/server'
import { OpenAPIHandler } from './openapi-handler'

describe('openAPIHandler', () => {
  it('works', async () => {
    const handler = new OpenAPIHandler(os.route({ method: 'GET' }).handler(() => 'pong'))

    const { response } = await handler.handle(new Request('https://example.com/api/v1/'), {
      prefix: '/api/v1',
    })

    await expect(response?.text()).resolves.toContain('pong')
    expect(response?.status).toBe(200)
  })
})
