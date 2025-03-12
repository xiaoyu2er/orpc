import type { APIEvent } from '@solidjs/start/server'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { router } from '~/router'

const handler = new OpenAPIHandler(router)

async function handle({ request }: APIEvent) {
  const { response } = await handler.handle(request, {
    prefix: '/api',
    context: {}, // Provide initial context if needed
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCh = handle
export const DELETE = handle
