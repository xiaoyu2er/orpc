import { os, ORPCError } from '@orpc/server'
import { oz } from '@orpc/zod'
import { z } from 'zod'

export type Context = { user?: { id: string } }

// global osw completely optional, needed when you want to use context
export const osw /** os with ... */ = os.context<Context>()

export const router = osw.router({
  getting: os
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .handler(async (input, context, meta) => {
      return {
        message: `Hello, ${input.name}!`,
      }
    }),

  post: osw.prefix('/posts').router({
    find: osw
      .route({
        path: '/{id}', // custom your OpenAPI
        method: 'GET',
      })
      .input(
        z.object({
          id: z.string({}),
        }),
      )
      .output(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      )
      .use((input, context, meta) => {
        if (!context.user) {
          throw new ORPCError({
            code: 'UNAUTHORIZED',
          })
        }

        meta.onSuccess((output) => {
          // do something on success
        })

        return {
          context: {
            user: context.user, // from now user not undefined-able
          },
        }
      })
      .handler((input, context, meta) => {
        return {
          id: 'example',
          title: 'example',
          description: 'example',
        }
      }),

    create: osw
      .input(
        z.object({
          title: z.string(),
          description: z.string(),
          thumb: oz.file().type('image/*'),
        }),
      )
      .handler(async (input, context, meta) => {
        input.thumb // file upload out of the box

        return {
          id: 'example',
          title: input.title,
          description: input.description,
        }
      }),
  }),
})

// Expose apis to the internet with fetch handler

import { createFetchHandler } from '@orpc/server/fetch'

const handler = createFetchHandler({
  router,
  serverless: false, // set true will improve cold start times
})

// Modern runtime that support fetch api like deno, bun, cloudflare workers, even node can used

import { createServer } from 'node:http'
import { createServerAdapter } from '@whatwg-node/server'

const server = createServer(
  createServerAdapter((request: Request) => {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api')) {
      return handler({
        request,
        prefix: '/api',
        context: {},
      })
    }

    return new Response('Not found', { status: 404 })
  }),
)

server.listen(2026, () => {
  // biome-ignore lint/suspicious/noConsole: <explanation>
  console.log('Server is available at http://localhost:2026')
})

//
//
