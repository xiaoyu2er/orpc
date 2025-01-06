import { ORPCHandler } from '@orpc/server/fetch'
import { router } from '../../router'
import '../../../polyfill'

const openAPIHandler = new ORPCHandler(router, {
  onError: ({ error }) => {
    console.error(error)
  },
})

export async function GET(request: Request) {
  const { matched, response } = await openAPIHandler.handle(request, { prefix: '/rpc' })

  if (matched) {
    return response
  }

  // Your custom logic here (e.g., calling `next()` in Express.js or Hono.js)

  return new Response('Not found', { status: 404 })
}

export const POST = GET
export const PUT = GET
export const DELETE = GET
export const PATCH = GET
