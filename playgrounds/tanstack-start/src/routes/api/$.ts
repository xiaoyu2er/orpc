import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { ZodSmartCoercionPlugin, ZodToJsonSchemaConverter } from '@orpc/zod'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { router } from '~/router/index'

const handler = new OpenAPIHandler(router, {
  plugins: [
    new ZodSmartCoercionPlugin(),
    new OpenAPIReferencePlugin({
      docsPath: '/docs',
      schemaConverters: [
        new ZodToJsonSchemaConverter(),
      ],
      specGenerateOptions: {
        info: {
          title: 'ORPC Playground',
          version: '1.0.0',
        },
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
          },
        },
      },
    }),
  ],
})

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: '/api',
    context: {}, // Provide initial context if needed
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const APIRoute = createAPIFileRoute('/api/$')({
  HEAD: handle,
  GET: handle,
  POST: handle,
  PUT: handle,
  PATCH: handle,
  DELETE: handle,
})
