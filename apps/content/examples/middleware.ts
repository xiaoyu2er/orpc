import { ORPCError, os } from '@orpc/server'
import { z } from 'zod'

// in oRPC middleware is so powerful

export type Context = { user?: { id: string } }

export const pub /** public access */ = os
  .context<Context>()
  .use((input, context, meta) => {
    // This middleware will apply to everything create from pub
    const start = Date.now()

    meta.onFinish((output, error) => {
      // eslint-disable-next-line no-console
      console.log(`middleware cost ${Date.now() - start}ms`)
    })
  })

export const authMid = pub.middleware(async (input, context, meta) => {
  if (!context.user) {
    throw new ORPCError({ code: 'UNAUTHORIZED' })
  }

  meta.onSuccess((output) => {})
  meta.onSuccess((_error) => {})
  meta.onFinish((output, error) => {})

  const _path = meta.path // for analyze
  const _procedure = meta.procedure // for analyze

  return {
    context: {
      user: context.user,
    },
  }
})

export const authed = pub.use(authMid) // any procedure compose from authOS will be protected

export const canEditPost = authMid.concat(
  // Now you expect to have id in input
  async (input: { id: string }, context, meta) => {
    if (context.user.id !== input.id) {
      throw new ORPCError({ code: 'UNAUTHORIZED' })
    }
  },
)

export const editPost = authed
  .input(z.object({ id: z.string() }))
  .output(z.string())
  .use(canEditPost) // if input not match, will throw type error
  .use(canEditPost, old => ({ id: old.id })) // Can map input if needed
  .use((input, context, meta) => {
    // If middleware create after .input and .output them will be typed

    meta.onSuccess((output) => {})
  })
  .handler(() => 'Edited')

//
//
