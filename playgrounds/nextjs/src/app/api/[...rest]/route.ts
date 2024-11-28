import { createFetchHandler } from '@orpc/server/fetch'
import { router } from './router'

const handler = createFetchHandler({
  router,
  serverless: true,
  // hooks(context, hooks) {
  //   return hooks.next()
  // },
})

function handleRequest(request: Request) {
  return handler({
    request,
    prefix: '/api',
  })
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
export const PATCH = handleRequest
