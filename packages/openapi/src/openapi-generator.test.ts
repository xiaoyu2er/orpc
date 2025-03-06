import type { OpenAPI } from './openapi'
import type { JSONSchema } from './schema'
import { oc } from '@orpc/contract'
import { z } from 'zod'
import { OpenAPIGenerator } from './openapi-generator'

describe('openapi generator', () => {
  const defaultSchema = z.object({})
  const defaultDoc = { info: { title: 'test', version: '1.0.0' } }
  const mockConverter = {
    condition: vi.fn(() => true),
    convert: vi.fn(),
  }
  const generator = new OpenAPIGenerator({
    schemaConverters: [mockConverter],
  })

  describe('input structure', () => {
    it('compact', async () => {
      const router = oc
        .route({
          path: '/ping/{name}',
          inputStructure: 'compact',
          outputStructure: 'compact',
        })
        .input(defaultSchema)
        .output(defaultSchema)

      mockConverter.convert.mockReturnValue([true, {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          other: {
            type: 'string',
          },
        },
      }])

      const spec = await generator.generate(router, defaultDoc)

      const operation = spec.paths!['/ping/{name}']!.post!
      const successResponse: OpenAPI.ResponseObject = operation.responses![200]

      expect(operation.parameters).toEqual([{
        name: 'name',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      }])
      expect(operation.requestBody).toMatchObject({
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                other: {
                  type: 'string',
                },
              },
            },
          },
        },
      })
      expect(successResponse).toMatchObject({
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                other: {
                  type: 'string',
                },
              },
            },
          },
        },
        headers: undefined,
      })
    })

    it('detailed', async () => {
      const inputSchema = z.object({ params: z.object({ name: z.string() }) })
      const outputSchema = z.object({ body: z.object({ message: z.string() }) })

      const router = oc
        .route({
          path: '/ping/{name}',
          inputStructure: 'detailed',
          outputStructure: 'detailed',
        })
        .input(inputSchema)
        .output(outputSchema)

      mockConverter.convert.mockImplementation((schema) => {
        if (schema === inputSchema) {
          return [true, {
            type: 'object',
            properties: {
              params: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                },
              },
              query: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  age: {
                    type: 'number',
                  },
                },
              },
              headers: {
                type: 'object',
                properties: {
                  'x-custom-header': {
                    type: 'string',
                  },
                },
              },
              body: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    examples: [
                      {
                        message: 'Hello World',
                      },
                      {
                        message: 'Hello World 2',
                      },
                    ],
                  },
                },
              },
            },
          } satisfies JSONSchema]
        }

        return [true, {
          type: 'object',
          properties: {
            headers: {
              type: 'object',
              properties: {
                'x-custom-header': {
                  type: 'string',
                },
              },
            },
            body: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                },
              },
            },
          },
        }]
      })

      const spec = await generator.generate(router, defaultDoc)

      const operation = spec.paths!['/ping/{name}']!.post!
      const successResponse: OpenAPI.ResponseObject = operation.responses![200]

      expect(operation.parameters).toEqual([
        {
          name: 'name',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
        },
        {
          name: 'name',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
        },
        {
          name: 'age',
          in: 'query',
          required: false,
          schema: {
            type: 'number',
          },
        },
        {
          name: 'x-custom-header',
          in: 'header',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ])
      expect(operation.requestBody).toMatchObject({
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  examples: [
                    {
                      message: 'Hello World',
                    },
                    {
                      message: 'Hello World 2',
                    },
                  ],
                },
              },
            },
          },
        },
      })
      expect(successResponse).toMatchObject({
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                },
              },
            },
          },
        },
        headers: {
          'x-custom-header': {
            required: false,
            schema: {
              type: 'string',
            },
          },
        },
      })
    })
  })

  describe('errors', () => {
    const schema = z.object({})

    const contract = oc.errors({
      BAD_GATEWAY: {
        data: schema,
      },
    }).route({})

    it('strictErrorResponses=true', async () => {
      mockConverter.convert.mockReturnValue([true, { description: '__mocked__' }])

      const spec = await generator.generate(contract, defaultDoc)

      expect(spec.paths!['/']).toEqual({
        post: {
          operationId: '',
          responses: {
            200: {
              description: 'OK',
            },
            502: {
              description: '502',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          defined: { const: true },
                          code: { const: 'BAD_GATEWAY' },
                          status: { const: 502 },
                          message: { type: 'string', default: undefined },
                          data: { description: '__mocked__' },
                        },
                        required: ['defined', 'code', 'status', 'message'],
                      },
                      {
                        type: 'object',
                        properties: {
                          defined: { const: false },
                          code: { type: 'string' },
                          status: { type: 'number' },
                          message: { type: 'string' },
                          data: {},
                        },
                        required: ['defined', 'code', 'status', 'message'],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      })
    })

    it('strictErrorResponses=false', async () => {
      const generator = new OpenAPIGenerator({
        schemaConverters: [mockConverter],
        strictErrorResponses: false,
      })

      mockConverter.convert.mockReturnValue([true, { description: '__mocked__' }])

      const spec = await generator.generate(contract, defaultDoc)

      expect(spec.paths!['/']).toEqual({
        post: {
          operationId: '',
          responses: {
            200: {
              description: 'OK',
            },
            502: {
              description: '502',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      defined: { const: true },
                      code: { const: 'BAD_GATEWAY' },
                      status: { const: 502 },
                      message: { type: 'string', default: undefined },
                      data: { description: '__mocked__' },
                    },
                    required: ['defined', 'code', 'status', 'message'],
                  },
                },
              },
            },
          },
        },
      })
    })
  })
})
