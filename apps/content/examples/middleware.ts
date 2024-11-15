import { os, ORPCError } from '@orpc/server'
import { z } from 'zod'

// in oRPC middleware is so powerful

export type Context = { user?: { id: string } }

const osw = os.context<Context>().use((input, context, meta) => {
  // This middleware will apply to everything create from osw
  const start = Date.now()

  meta.onFinish((output, error) => {
    // biome-ignore lint/suspicious/noConsole: <explanation>
    console.log(`middleware cost ${Date.now() - start}ms`)
  })
})

export const authMiddleware = osw.middleware(async (input, context, meta) => {
  if (!context.user) {
    throw new ORPCError({ code: 'UNAUTHORIZED' })
  }

  meta.onSuccess((output) => {})
  meta.onSuccess((error) => {})
  meta.onFinish((output, error) => {})

  meta.path // for analyze
  meta.procedure // for analyze

  return {
    context: {
      user: context.user,
    },
  }
})

export const authOS = osw.use(authMiddleware) // any procedure compose from authOS will be protected

export const canEditPost = authMiddleware.concat(
  // Now you expect to have id in input
  async (input: { id: string }, context, meta) => {
    if (context.user.id !== input.id) {
      throw new ORPCError({ code: 'UNAUTHORIZED' })
    }
  },
)

const editPost = authOS
  .input(z.object({ id: z.string() }))
  .output(z.string())
  .use(canEditPost) // if input not match, will throw type error
  .use(canEditPost, (old) => ({ id: old.id })) // Can map input if needed
  .use((input, context, meta) => {
    // If middleware create after .input and .output them will be typed

    meta.onSuccess((output) => {})
  })
  .handler(() => 'Edited')

//
//
