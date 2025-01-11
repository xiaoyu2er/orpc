import { router } from '@/router'
import { RPCHandler, serve } from '@orpc/server/next'
import '../../../polyfill'

const rpcHandler = new RPCHandler(router, {
  onError: ({ error }) => {
    console.error(error)
  },
})

export const { GET, POST, PUT, PATCH, DELETE } = serve(rpcHandler, {
  prefix: '/rpc',
  context: async (req) => {
    return {}
  },
})
