import type { z } from 'zod'
import type { UserSchema } from './schemas/user'
import { ORPCError, os } from '@orpc/server'
import { contract } from './contract'

export interface ORPCContext {
  user?: z.infer<typeof UserSchema>
  db?: any
}

const base = os.context<ORPCContext>()

const logMid = base.middleware(async ({ context, path, next }, input) => {
  const start = Date.now()

  try {
    return await next({})
  }
  finally {
    // eslint-disable-next-line no-console
    console.log(`[${path.join('/')}] ${Date.now() - start}ms`)
  }
})

const authMid = base.middleware(({ context, next, path }, input) => {
  if (!context.user) {
    throw new ORPCError({
      code: 'UNAUTHORIZED',
    })
  }

  return next({
    context: {
      user: context.user,
    },
  })
})

export const pub = base.use(logMid).contract(contract)
export const authed = base.use(logMid).use(authMid).contract(contract)
