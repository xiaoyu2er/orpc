import type { ResponseHeadersPluginContext } from '@orpc/server/plugins'
import type { z } from 'zod'
import type { UserSchema } from './schemas/user'
import { oo } from '@orpc/openapi'
import { ORPCError, os } from '@orpc/server'

export interface ORPCContext extends ResponseHeadersPluginContext {
  user?: z.infer<typeof UserSchema>
  db?: any
}

export const base = os.$context<ORPCContext>()

export const pub = base.use(async ({ context, path, next }, input) => {
  const start = Date.now()

  try {
    return await next({})
  }
  finally {
    console.log(`[${path.join('/')}] ${Date.now() - start}ms`)
  }
})

const authMid = oo.spec( // this line is optional, just for customize openapi spec
  base.middleware(({ context, path, next }, input) => {
    if (!context.user) {
      throw new ORPCError('UNAUTHORIZED')
    }

    return next({
      context: {
        user: context.user,
      },
    })
  }),
  {
    security: [
      { bearerAuth: [] },
    ],
  },
)

export const authed = base.use(authMid)
