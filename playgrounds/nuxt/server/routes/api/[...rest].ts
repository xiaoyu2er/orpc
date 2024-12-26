import { OpenAPIServerlessHandler } from '@orpc/openapi/fetch'
import { CompositeHandler, ORPCHandler } from '@orpc/server/fetch'
import { ZodCoercer } from '@orpc/zod'
import { createServerAdapter } from '@whatwg-node/server'
import { router } from '~/server/router'

const openAPIHandler = new OpenAPIServerlessHandler(router, {
  schemaCoercers: [
    new ZodCoercer(),
  ],
})
const orpcHandler = new ORPCHandler(router)
const compositeHandler = new CompositeHandler([openAPIHandler, orpcHandler])

export default defineEventHandler((event) => {
  const handler = createServerAdapter((request: Request) => {
    const context = request.headers.get('Authorization')
      ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
      : {}

    return compositeHandler.fetch(request, {
      prefix: '/api',
      context,
    })
  })

  return handler(event.node.req, event.node.res)
})
