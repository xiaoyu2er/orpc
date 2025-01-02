import { OpenAPIServerlessHandler } from '@orpc/openapi/node'
import { CompositeHandler, ORPCHandler } from '@orpc/server/node'
import { ZodCoercer } from '@orpc/zod'
import { router } from '~/server/router'
import '../../polyfill'

const openAPIHandler = new OpenAPIServerlessHandler(router, {
  schemaCoercers: [
    new ZodCoercer(),
  ],
  onError: ({ error }) => {
    console.error(error)
  },
})
const orpcHandler = new ORPCHandler(router, {
  onError: ({ error }) => {
    console.error(error)
  },
})
const compositeHandler = new CompositeHandler([openAPIHandler, orpcHandler])

export default defineEventHandler((event) => {
  const context = event.node.req.headers.authorization
    ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
    : {}

  return compositeHandler.handle(event.node.req, event.node.res, {
    prefix: '/api',
    context,
  })
})
