import type { APIEvent } from '@solidjs/start/server'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { router } from '~/router'
import { ZodSmartCoercionPlugin } from '@orpc/zod'

const handler = new OpenAPIHandler(router, {
  plugins: [
    new ZodSmartCoercionPlugin(),
  ],
})

async function handle({ request }: APIEvent) {
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
export const PATCh = handle
export const DELETE = handle
