import { OpenAPIServerlessHandler } from '@orpc/openapi/fetch'
import { CompositeHandler, ORPCHandler } from '@orpc/server/fetch'
import { ZodCoercer } from '@orpc/zod'
import { router } from './router'

const openAPIHandler = new OpenAPIServerlessHandler(router, {
  schemaCoercers: [
    new ZodCoercer(),
  ],
})
const orpcHandler = new ORPCHandler(router)
const compositeHandler = new CompositeHandler([openAPIHandler, orpcHandler])

export function GET(request: Request) {
  return compositeHandler.fetch(request, {
    prefix: '/api',
  })
}

export const POST = GET
export const PUT = GET
export const DELETE = GET
export const PATCH = GET
