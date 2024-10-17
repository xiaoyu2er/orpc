import { initORPCContract } from '@orpc/contract'
import type { OpenAPIObject } from 'openapi3-ts/oas31'
import { z } from 'zod'
import { generateOpenAPI } from './generator'

it('works', () => {
  const o = initORPCContract

  const router = o.router({
    ping: o.output(z.string()),

    user: {
      find: o
        .route({ method: 'GET', path: '/users/{id}', tags: ['user'] })
        .input(z.object({ id: z.string() }))
        .output(z.object({ name: z.string() })),
    },
  })

  const spec = generateOpenAPI({
    router,
    info: {
      title: 'test',
      version: '1.0.0',
    },
  })

  expect(spec).toMatchObject({
    openapi: '3.1.0',
    info: {
      title: 'test',
      version: '1.0.0',
    },
    paths: {
      '/.ping': {
        post: {
          responses: {
            '200': {
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
        },
      },
      '/users/{id}': {
        get: {
          tags: ['user'],
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
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                      },
                    },
                    required: ['name'],
                  },
                },
              },
            },
          },
        },
      },
    },
  } satisfies OpenAPIObject)
})

it('throwOnMissingTagDefinition option', () => {
  const o = initORPCContract

  const router = o.router({
    ping: o.output(z.string()),

    user: {
      find: o
        .route({ method: 'GET', path: '/users/{id}', tags: ['user'] })
        .input(z.object({ id: z.string() }))
        .output(z.object({ name: z.string() })),
    },
  })

  const spec = generateOpenAPI(
    {
      router,
      info: {
        title: 'test',
        version: '1.0.0',
      },
      tags: [
        {
          name: 'user',
          description: 'User related apis',
        },
      ],
    },
    { throwOnMissingTagDefinition: true },
  )

  expect(spec).toMatchObject({
    openapi: '3.1.0',
    info: {
      title: 'test',
      version: '1.0.0',
    },
    tags: [
      {
        name: 'user',
        description: 'User related apis',
      },
    ],
    paths: {
      '/.ping': {
        post: {
          responses: {
            '200': {
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
        },
      },
      '/users/{id}': {
        get: {
          tags: ['user'],
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
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                      },
                    },
                    required: ['name'],
                  },
                },
              },
            },
          },
        },
      },
    },
  } satisfies OpenAPIObject)

  expect(() =>
    generateOpenAPI(
      {
        router,
        info: {
          title: 'test',
          version: '1.0.0',
        },
      },
      { throwOnMissingTagDefinition: true },
    ),
  ).toThrow(
    'Tag "user" is missing definition. Please define it in OpenAPI root tags object. [user.find]',
  )
})
