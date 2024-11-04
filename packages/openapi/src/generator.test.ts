import { initORPCContract } from '@orpc/contract'
import { oz } from '@orpc/zod'
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

it('support single file upload', () => {
  const o = initORPCContract

  const router = o.router({
    upload: o
      .input(z.union([z.string(), oz.file()]))
      .output(
        z.union([oz.file().type('image/jpg'), oz.file().type('image/png')]),
      ),
  })

  const spec = generateOpenAPI({
    router,
    info: {
      title: 'test',
      version: '1.0.0',
    },
  })

  expect(spec).toMatchObject({
    paths: {
      '/.upload': {
        post: {
          requestBody: {
            content: {
              '*/*': {
                schema: {
                  type: 'string',
                  contentMediaType: '*/*',
                },
              },
              'application/json': {
                schema: {
                  anyOf: [{ type: 'string' }],
                },
              },
            },
          },
          responses: {
            '200': {
              content: {
                'image/jpg': {
                  schema: {
                    type: 'string',
                    contentMediaType: 'image/jpg',
                  },
                },
                'image/png': {
                  schema: {
                    type: 'string',
                    contentMediaType: 'image/png',
                  },
                },
              },
            },
          },
        },
      },
    },
  })
})

it('support multipart/form-data', () => {
  const o = initORPCContract

  const router = o.router({
    resize: o
      .input(
        z.object({
          file: oz.file().type('image/*'),
          height: z.number(),
          width: z.number(),
        }),
      )
      .output(oz.file().type('image/*')),
  })

  const spec = generateOpenAPI({
    router,
    info: {
      title: 'test',
      version: '1.0.0',
    },
  })

  expect(spec).toMatchObject({
    paths: {
      '/.resize': {
        post: {
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      contentMediaType: 'image/*',
                    },
                    height: {
                      type: 'number',
                    },
                    width: {
                      type: 'number',
                    },
                  },
                  required: ['file', 'height', 'width'],
                },
              },
            },
          },
          responses: {
            '200': {
              content: {
                'image/*': {
                  schema: {
                    type: 'string',
                    contentMediaType: 'image/*',
                  },
                },
              },
            },
          },
        },
      },
    },
  })
})
