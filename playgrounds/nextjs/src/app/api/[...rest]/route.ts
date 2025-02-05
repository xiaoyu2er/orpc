import { router } from '@/router'
import { OpenAPIHandler } from '@orpc/openapi/next'
import { onError } from '@orpc/server'
import { serve } from '@orpc/server/next'
import { ZodCoercer } from '@orpc/zod'
import '../../../polyfill'

const openAPIHandler = new OpenAPIHandler(router, {
  schemaCoercers: [
    new ZodCoercer(),
  ],
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

export const { GET, POST, PUT, PATCH, DELETE } = serve(openAPIHandler, {
  prefix: '/api',
  context: async (req) => {
    return {}
  },
})
