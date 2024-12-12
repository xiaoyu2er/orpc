import type { z } from 'zod'
import type { UserSchema } from './schemas/user'
import { ORPCError, os } from '@orpc/server'

export type ORPCContext = { user?: z.infer<typeof UserSchema>, db: any }

export const pub = os.context<ORPCContext>().use(async (input, context, meta) => {
  const start = Date.now()

  try {
    return await meta.next({})
  }
  finally {
    // eslint-disable-next-line no-console
    console.log(`[${meta.path.join('/')}] ${Date.now() - start}ms`)
  }
})

export const authed = pub.use((input, context, meta) => {
  if (!context.user) {
    throw new ORPCError({
      code: 'UNAUTHORIZED',
    })
  }

  return meta.next({
    context: {
      user: context.user,
    },
  })
})
