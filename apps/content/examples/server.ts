import type { InferRouterInputs, InferRouterOutputs } from '@orpc/server'
import { ORPCError, os } from '@orpc/server'
import { oz, ZodCoercer } from '@orpc/zod'
import { z } from 'zod'

export type Context = { user?: { id: string } } | undefined

// global pub, authed completely optional
export const pub = os.context<Context>()
export const authed = pub.use(({ context, path, next }, input) => {
  /** put auth logic here */
  return next({})
})

export const router = pub.router({
  getUser: os
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      return {
        id: input.id,
        name: 'example',
      }
    }),

  posts: pub.prefix('/posts').router({
    getPost: pub
      .route({
        path: '/{id}', // custom your OpenAPI
        method: 'GET',
      })
      .input(
        z.object({
          id: z.string(),
        }),
      )
      .output(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      )
      .use(async ({ context, path, next }, input) => {
        if (!context?.user) {
          throw new ORPCError({
            code: 'UNAUTHORIZED',
          })
        }

        const result = await next({
          context: {
            user: context.user, // from now user not undefined-able
          },
        })

        const _output = result.output // do something on success

        return result
      })
      .handler(({ input, context }) => {
        return {
          id: 'example',
          title: 'example',
          description: 'example',
        }
      }),

    createPost: authed
      .input(
        z.object({
          title: z.string(),
          description: z.string(),
          thumb: oz.file().type('image/*'),
        }),
      )
      .handler(async ({ input, context }) => {
        const _thumb = input.thumb // file upload out of the box

        return {
          id: 'example',
          title: input.title,
          description: input.description,
        }
      }),
  }),
})

export type Inputs = InferRouterInputs<typeof router>
export type Outputs = InferRouterOutputs<typeof router>

// Modern runtime that support fetch api like deno, bun, cloudflare workers, even node can used
import { createServer } from 'node:http'
import { OpenAPIServerlessHandler } from '@orpc/openapi/node'
import { CompositeHandler, ORPCHandler } from '@orpc/server/node'

const openapiHandler = new OpenAPIServerlessHandler(router, {
  schemaCoercers: [
    new ZodCoercer(),
  ],
})
const orpcHandler = new ORPCHandler(router)
const compositeHandler = new CompositeHandler([openapiHandler, orpcHandler])

const server = createServer((req, res) => {
  if (req.url?.startsWith('/api')) {
    return compositeHandler.handle(req, res, {
      prefix: '/api',
      context: {},
    })
  }

  res.statusCode = 404
  res.end('Not found')
})

server.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('Server is available at http://localhost:3000')
})

//
//

export default router
