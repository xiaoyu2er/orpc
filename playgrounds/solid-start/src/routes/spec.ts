import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod'
import type { APIEvent } from '@solidjs/start/server'
import { router } from '~/router'

const openAPIGenerator = new OpenAPIGenerator({
  schemaConverters: [
    new ZodToJsonSchemaConverter(),
  ],
})

export async function GET(event: APIEvent) {
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
}
