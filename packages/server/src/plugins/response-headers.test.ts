import type { ResponseHeadersPluginContext } from './response-headers'
import { OpenAPIHandler } from '../../../openapi/src/adapters/fetch/openapi-handler'
import { os } from '../builder'
import { ResponseHeadersPlugin } from './response-headers'

it('responseHeadersPlugin', async () => {
  const router = os
    .$context<ResponseHeadersPluginContext>()
    .use(({ context, next }) => {
      context.resHeaders?.set('x-custom-1', 'mid')
      context.resHeaders?.set('x-custom-2', 'mid')
      context.resHeaders?.set('x-custom-3', 'mid')
      context.resHeaders?.set('x-custom-4', 'mid')

      return next()
    })
    .route({
      method: 'GET',
      path: '/ping',
      outputStructure: 'detailed',
    })
    .handler(() => {
      return {
        headers: {
          'x-custom-1': 'value',
          'x-custom-2': ['1', '2'],
          'x-custom-3': undefined,
        },
      }
    })

  const handler = new OpenAPIHandler(router, {
    plugins: [
      new ResponseHeadersPlugin(),
    ],
  })

  const { response } = await handler.handle(new Request('https://example.com/ping'))

  if (!response) {
    throw new Error('response is undefined')
  }

  expect(response.headers.get('x-custom-1')).toBe('value, mid')
  expect(response.headers.get('x-custom-2')).toBe('1, 2, mid')
  expect(response.headers.get('x-custom-3')).toBe('mid')
  expect(response.headers.get('x-custom-4')).toBe('mid')

  await handler.handle(new Request('https://example.com/not_found'))
})
