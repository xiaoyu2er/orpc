import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod'
import { router } from '~/server/router'

const openAPIGenerator = new OpenAPIGenerator({
  schemaConverters: [
    new ZodToJsonSchemaConverter(),
  ],
})

export default defineEventHandler(async (event) => {
  const spec = await openAPIGenerator.generate(router, {
    info: {
      title: 'ORPC Playground',
      version: '1.0.0',
    },
    servers: [{ url: '/api' /** Should use absolute URLs in production */ }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  })

  return spec
})
