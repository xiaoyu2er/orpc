import { ORPCError, os } from '@orpc/server'
import { z } from 'zod'

// in oRPC middleware is so powerful

export type Context = { user?: { id: string } }

export const pub = os.$context<Context>()

export const authMiddleware = pub.middleware(async ({ context, next, path, procedure }, input) => {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED')
  }

  const result = await next({ context: { user: context.user } })
  const _output = result.output // for analyze
  return result
})

export const authed = pub.use(authMiddleware) // any procedure compose from authOS will be protected

export const canEditPost = authMiddleware.concat(
  // Now you expect to have id in input
  async ({ context, next }, input: { id: string }) => {
    if (context.user.id !== input.id) {
      throw new ORPCError('UNAUTHORIZED')
    }

    return next({})
  },
)

export const editPost = authed
  .input(z.object({ id: z.string() }))
  .output(z.string())
  .use(canEditPost) // if input not match, will throw type error
  .use(canEditPost, old => ({ id: old.id })) // Can map input if needed
  .use(async ({ context, path, next }, input) => {
    // If middleware create after .input and .output them will be typed

    const result = await next({})
    const _output = result.output
    return result
  })
  .handler(() => 'Edited')

//
//
