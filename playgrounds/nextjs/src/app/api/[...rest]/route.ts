import { OpenAPIServerlessHandler } from '@orpc/openapi/next'
import { serve } from '@orpc/server/next'
import { ZodCoercer } from '@orpc/zod'
import { router } from '../../router'
import '../../../polyfill'

const openAPIHandler = new OpenAPIServerlessHandler(router, {
  schemaCoercers: [
    new ZodCoercer(),
  ],
  onError: ({ error }) => {
    console.error(error)
  },
})

export const { GET, POST, PUT, PATCH, DELETE } = serve(openAPIHandler, {
  prefix: '/api',
  context: async (req) => {
    return {}
  },
})
