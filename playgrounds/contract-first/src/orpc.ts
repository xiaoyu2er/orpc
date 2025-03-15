import type { z } from 'zod'
import type { UserSchema } from './schemas/user'
import { implement, ORPCError } from '@orpc/server'
import { contract } from './contract'

export interface ORPCContext {
  user?: z.infer<typeof UserSchema>
  db?: any
}

const base = implement(contract).$context<ORPCContext>()

const logMid = base.middleware(async ({ context, path, next }, input) => {
  const start = Date.now()

  try {
    return await next({})
  }
  finally {
    console.log(`[${path.join('/')}] ${Date.now() - start}ms`)
  }
})

const authMid = base.middleware(({ context, next, path }, input) => {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED')
  }

  return next({
    context: {
      user: context.user,
    },
  })
})

export const pub = base.use(logMid)
export const authed = base.use(logMid).use(authMid)
