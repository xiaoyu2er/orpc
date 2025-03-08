import type { OpenAPI } from './openapi'
import { type AnyContractProcedure, eventIterator, oc } from '@orpc/contract'
import { z } from 'zod'
import { oz, ZodToJsonSchemaConverter } from '../../zod/src'
import { OpenAPIGenerator } from './openapi-generator'

type TestCase = {
  name: string
  contract: AnyContractProcedure
  expected: OpenAPI.PathsObject
  error?: undefined
} | {
  name: string
  contract: AnyContractProcedure
  expected?: undefined
  error: string
}

const routeTests: TestCase[] = [
  {
    name: 'default',
    contract: oc,
    expected: {
      '/': {
        post: expect.any(Object),
      },
    },
  },
  {
    name: 'path + method',
    contract: oc.route({ path: '/planets', method: 'GET' }),
    expected: {
      '/planets': {
        get: expect.any(Object),
      },
    },
  },
  {
    name: 'dynamic params + method',
    contract: oc.route({ path: '/planets/{id}', method: 'DELETE' }).input(z.object({ id: z.string() })),
    expected: {
      '/planets/{id}': {
        delete: expect.any(Object),
      },
    },
  },
  {
    name: 'rest params + method',
    contract: oc.route({ path: '/planets/{+path}', method: 'DELETE' }).input(z.object({ path: z.string() })),
    expected: {
      '/planets/{path}': {
        delete: expect.any(Object),
      },
    },
  },
  {
    name: 'metadata',
    contract: oc.route({
      tags: ['planets'],
      summary: 'the summary',
      description: 'the description',
      successStatus: 203,
      successDescription: 'the success description',
      deprecated: true,
    }),
    expected: {
      '/': {
        post: expect.objectContaining({
          tags: ['planets'],
          summary: 'the summary',
          description: 'the description',
          deprecated: true,
          responses: {
            203: expect.objectContaining({
              description: 'the success description',
            }),
          },
        }),
      },
    },
  },
]

const inputTests: TestCase[] = [
  {
    name: 'invalid input',
    contract: oc.route({ path: '/planets/{id}' }),
    error: 'When input structure is "compact", and path has dynamic params, input schema must be an object with all dynamic params as required.',
  },
  {
    name: 'invalid input',
    contract: oc.route({ path: '/planets/{id}' }).input(z.string()),
    error: 'When input structure is "compact", and path has dynamic params, input schema must be an object with all dynamic params as required.',
  },
  {
    name: 'params must be required',
    contract: oc.route({ path: '/planets/{id}' }).input(z.object({ id: z.string().optional(), value: z.string().optional() })),
    error: 'When input structure is "compact", and path has dynamic params, input schema must be an object with all dynamic params as required.',
  },
  {
    name: 'dynamic params + body',
    contract: oc.route({ path: '/planets/{id}' }).input(z.object({ id: z.string(), value: z.string() })),
    expected: {
      '/planets/{id}': {
        post: expect.objectContaining({
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    value: {
                      type: 'string',
                    },
                  },
                  required: ['value'],
                },
              },
            },
            required: true,
          },
        }),
      },
    },
  },
  {
    name: 'query + params',
    contract: oc.route({ path: '/planets/{id}', method: 'GET' }).input(z.object({ id: z.string(), query1: z.string(), query2: z.number().optional() })),
    expected: {
      '/planets/{id}': {
        get: expect.objectContaining({
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'query1',
              in: 'query',
              required: true,
              explode: true,
              style: 'deepObject',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'query2',
              in: 'query',
              required: false,
              explode: true,
              style: 'deepObject',
              schema: {
                type: 'number',
              },
            },
          ],
        }),
      },
    },
  },
  {
    name: 'not throw in GET + any input',
    contract: oc.route({ method: 'GET' }).input(z.any()),
    expected: {
      '/': {
        get: expect.objectContaining({
        }),
      },
    },
  },
  {
    name: 'GET + non-object input',
    contract: oc.route({ method: 'GET' }).input(z.string()),
    error: 'When method is "GET", input schema must satisfy: object | any | unknown',
  },
  {
    name: 'file',
    contract: oc.input(oz.file().type('image/png')),
    expected: {
      '/': {
        post: expect.objectContaining({
          requestBody: {
            content: {
              'image/png': {
                schema: {
                  type: 'string',
                  contentMediaType: 'image/png',
                },
              },
            },
            required: true,
          },
        }),
      },
    },
  },
  {
    name: 'event iterator',
    contract: oc.input(eventIterator(z.string(), z.boolean())),
    expected: {
      '/': {
        post: expect.objectContaining({
          requestBody: {
            content: {
              'text/event-stream': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        event: { const: 'message' },
                        data: { type: 'string' },
                        id: { type: 'string' },
                        retry: { type: 'number' },
                      },
                      required: ['event', 'data'],
                    },
                    {
                      type: 'object',
                      properties: {
                        event: { const: 'done' },
                        data: { type: 'boolean' },
                        id: { type: 'string' },
                        retry: { type: 'number' },
                      },
                      required: ['event', 'data'],
                    },
                    {
                      type: 'object',
                      properties: {
                        event: { const: 'error' },
                        data: {},
                        id: { type: 'string' },
                        retry: { type: 'number' },
                      },
                      required: ['event'],
                    },
                  ],
                },
              },
            },
            required: true,
          },
        }),
      },
    },
  },
  {
    name: 'inputStructure=detailed',
    contract: oc.route({ path: '/planets/{id}', inputStructure: 'detailed' }).input(z.object({
      params: z.object({ id: z.string() }),
      query: z.object({ query1: z.string(), query2: z.number().optional() }),
      headers: z.object({ header1: z.string(), header2: z.string().optional() }),
      body: z.string(),
    })),
    expected: {
      '/planets/{id}': {
        post: expect.objectContaining({
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'query1',
              in: 'query',
              required: true,
              explode: true,
              style: 'deepObject',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'query2',
              in: 'query',
              required: false,
              explode: true,
              style: 'deepObject',
              schema: {
                type: 'number',
              },
            },
            {
              name: 'header1',
              in: 'header',
              required: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'header2',
              in: 'header',
              required: false,
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'string' },
              },
            },
            required: true,
          },
        }),
      },
    },
  },
  {
    name: 'inputStructure=detailed all field is optional',
    contract: oc.route({ inputStructure: 'detailed' }).input(z.object({})),
    expected: {
      '/': {
        post: expect.toSatisfy(v => !v.parameters && !v.requestBody),
      },
    },
  },
  {
    name: 'inputStructure=detailed + invalid input',
    contract: oc.route({ inputStructure: 'detailed' }).input(z.string()),
    error: 'When input structure is "detailed", input schema must satisfy',
  },
  {
    name: 'inputStructure=detailed + invalid input',
    contract: oc.route({ inputStructure: 'detailed', path: '/{id}' }),
    error: 'When input structure is "detailed", input schema must satisfy',
  },
  {
    name: 'inputStructure=detailed + invalid input',
    contract: oc.route({ inputStructure: 'detailed' }).input(z.object({ })),
    expected: expect.any(Object),
  },
  {
    name: 'inputStructure=detailed + invalid input',
    contract: oc.route({ inputStructure: 'detailed' }).input(z.object({ query: z.string() })),
    error: 'When input structure is "detailed", input schema must satisfy',
  },
  {
    name: 'inputStructure=detailed + invalid input',
    contract: oc.route({ inputStructure: 'detailed', path: '/{id}' }).input(z.object({ params: z.object({ id: z.string().optional() }) })),
    error: 'When input structure is "detailed" and path has dynamic params, the "params" schema must be an object with all dynamic params as required.',
  },
]

const successResponseTests: TestCase[] = [
  {
    name: 'compact mode',
    contract: oc.output(z.string()),
    expected: {
      '/': {
        post: expect.objectContaining({
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
          },
        }),
      },
    },
  },
  {
    name: 'event iterator',
    contract: oc.output(eventIterator(z.string(), z.boolean())),
    expected: {
      '/': {
        post: expect.objectContaining({
          responses: {
            200: {
              description: 'OK',
              content: {
                'text/event-stream': {
                  schema: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          event: { const: 'message' },
                          data: { type: 'string' },
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event', 'data'],
                      },
                      {
                        type: 'object',
                        properties: {
                          event: { const: 'done' },
                          data: { type: 'boolean' },
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event', 'data'],
                      },
                      {
                        type: 'object',
                        properties: {
                          event: { const: 'error' },
                          data: {},
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event'],
                      },
                    ],
                  },
                },
              },
            },
          },
        }),
      },
    },
  },
  {
    name: 'outputStructure=detailed',
    contract: oc.route({ outputStructure: 'detailed' }).output(z.object({
      headers: z.object({ header1: z.string(), header2: z.string().optional() }),
      body: z.string(),
    })),
    expected: {
      '/': {
        post: expect.objectContaining({
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { type: 'string' },
                },
              },
              headers: {
                header1: {
                  required: true,
                  schema: {
                    type: 'string',
                  },
                },
                header2: {
                  required: false,
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
          },
        }),
      },
    },
  },
  {
    name: 'outputStructure=detailed all fields is optional',
    contract: oc.route({ outputStructure: 'detailed' }).output(z.object({})),
    expected: {
      '/': {
        post: {
          responses: {
            200: expect.toSatisfy(v => !v.content && !v.headers),
          },
        },
      },
    },
  },
  {
    name: 'outputStructure=detailed',
    contract: oc.route({ outputStructure: 'detailed' }).output(z.string()),
    error: 'When output structure is "detailed", output schema must satisfy',
  },
  {
    name: 'outputStructure=detailed',
    contract: oc.route({ outputStructure: 'detailed' }).output(z.object({ headers: z.string() })),
    error: 'When output structure is "detailed", output schema must satisfy',
  },
]

it.each([
  ...routeTests,
  ...inputTests,
  ...successResponseTests,
])('openAPIGenerator.generate: %# - $name', async ({ contract, expected, error }) => {
  const openAPIGenerator = new OpenAPIGenerator({
    schemaConverters: [
      new ZodToJsonSchemaConverter(),
    ],
  })

  const promise = openAPIGenerator.generate(contract, {
    info: {
      title: 'test',
      version: '1.0.0',
    },
  })

  if (error) {
    await expect(promise).rejects.toThrow(error)
  }
  else {
    await expect(promise).resolves.toEqual({
      openapi: '3.1.1',
      info: {
        title: 'test',
        version: '1.0.0',
      },
      paths: expected,
    })
  }
})
