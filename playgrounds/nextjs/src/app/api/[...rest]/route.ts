import { createOpenAPIServerHandler } from '@orpc/openapi/fetch'
import { createORPCHandler, handleFetchRequest } from '@orpc/server/fetch'
import { router } from './router'

export function GET(request: Request) {
  return handleFetchRequest({
    router,
    request,
    prefix: '/api',
    handlers: [createORPCHandler(), createOpenAPIServerHandler()],
  })
}

export const POST = GET
export const PUT = GET
export const DELETE = GET
export const PATCH = GET
