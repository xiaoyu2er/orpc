import { ORPCHandler, serve } from '@orpc/server/next'
import { router } from '../../router'
import '../../../polyfill'

const openAPIHandler = new ORPCHandler(router, {
  onError: ({ error }) => {
    console.error(error)
  },
})

export const { GET, POST, PUT, PATCH, DELETE } = serve(openAPIHandler, {
  prefix: '/rpc',
  context: async (req) => {
    return {}
  },
})
