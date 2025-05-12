import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod'
import { contract } from 'src/contract'

export class ReferenceService {
  private readonly openapiGenerator = new OpenAPIGenerator({
    schemaConverters: [
      new ZodToJsonSchemaConverter(),
    ],

  })

  spec() {
    return this.openapiGenerator.generate(contract, {
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
      servers: [
        { url: 'http://localhost:3000' },
      ],
    })
  }
}
