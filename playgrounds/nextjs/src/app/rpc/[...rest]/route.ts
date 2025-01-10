import { router } from '@/router'
import { ORPCHandler, serve } from '@orpc/server/next'
import '../../../polyfill'

const orpcHandler = new ORPCHandler(router, {
  onError: ({ error }) => {
    console.error(error)
  },
})

export const { GET, POST, PUT, PATCH, DELETE } = serve(orpcHandler, {
  prefix: '/rpc',
  context: async (req) => {
    return {}
  },
})
