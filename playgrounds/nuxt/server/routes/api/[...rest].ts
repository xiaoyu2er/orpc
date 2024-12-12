import { createOpenAPIServerHandler } from '@orpc/openapi/fetch'
import { createORPCHandler, handleFetchRequest } from '@orpc/server/fetch'
import { createServerAdapter } from '@whatwg-node/server'
import { router } from '~/server/router'

export default defineEventHandler((event) => {
  const handler = createServerAdapter((request: Request) => {
    const context = request.headers.get('Authorization')
      ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
      : {}

    return handleFetchRequest({
      request,
      prefix: '/api',
      context,
      router,
      handlers: [createORPCHandler(), createOpenAPIServerHandler()],
      onError: ({ error }) => {
        console.error(error)
      },
    })
  })

  return handler(event.node.req, event.node.res)
})
