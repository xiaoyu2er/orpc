import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { router } from '../../../router'
import { onError } from '@orpc/server'
import type { RequestHandler } from '@sveltejs/kit'
import { ZodSmartCoercionPlugin } from '@orpc/zod'
import '../../../polyfill'

const handler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
  plugins: [
    new ZodSmartCoercionPlugin(),
  ],
})

const handle: RequestHandler = async ({ request }) => {
  const context = request.headers.get('Authorization')
    ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
    : {}

  const { response } = await handler.handle(request, {
    prefix: '/api',
    context,
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
