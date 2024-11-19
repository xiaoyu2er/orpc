import { router } from '@/router'
import { createFetchHandler } from '@orpc/server/fetch'

const handler = createFetchHandler({
  router,
  serverless: true,
})

function handleRequest(request: Request) {
  const context = request.headers.get('Authorization')
    ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
    : {}

  return handler({
    request,
    prefix: '/api',
    context,
  })
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
export const PATCH = handleRequest
