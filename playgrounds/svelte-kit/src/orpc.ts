import type { z } from 'zod'
import type { UserSchema } from './schemas/user'
import { ORPCError, os } from '@orpc/server'

export interface ORPCContext {
  user?: z.infer<typeof UserSchema>
  db?: any
}

export const pub = os
  .$context<ORPCContext>()
  .use(async ({ context, path, next }, input) => {
    const start = Date.now()

    try {
      return await next({})
    }
    finally {
      console.log(`[${path.join('/')}] ${Date.now() - start}ms`)
    }
  })

export const authed = pub.use(({ context, path, next }, input) => {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED')
  }

  return next({
    context: {
      user: context.user,
    },
  })
})
