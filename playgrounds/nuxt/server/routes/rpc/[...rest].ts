import { RPCHandler } from '@orpc/server/node'
import { router } from '~/server/router'

const rpcHandler = new RPCHandler(router, {
  onError: ({ error }) => {
    console.error(error)
  },
})

export default defineEventHandler(async (event) => {
  const context = event.node.req.headers.authorization
    ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
    : {}

  const { matched } = await rpcHandler.handle(event.node.req, event.node.res, {
    prefix: '/rpc',
    context,
  })

  if (matched) {
    return
  }

  event.node.res.statusCode = 404
  event.node.res.end('Not found')
})
