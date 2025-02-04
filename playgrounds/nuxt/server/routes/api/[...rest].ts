import { OpenAPIHandler } from '@orpc/openapi/node'
import { ZodCoercer } from '@orpc/zod'
import { router } from '~/server/router'

const openAPIHandler = new OpenAPIHandler(router, {
  schemaCoercers: [
    new ZodCoercer(),
  ],
  onError: ({ error }) => {
    console.error(error)
  },
})

export default defineEventHandler(async (event) => {
  const context = event.node.req.headers.authorization
    ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
    : {}

  const { matched } = await openAPIHandler.handle(event.node.req, event.node.res, {
    prefix: '/api',
    context,
  })

  if (matched) {
    return
  }

  event.node.res.statusCode = 404
  event.node.res.end('Not found')
})
