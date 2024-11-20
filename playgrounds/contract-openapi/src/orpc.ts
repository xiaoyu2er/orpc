import { os, ORPCError } from '@orpc/server'
import type { z } from 'zod'
import { contract } from './contract'
import type { UserSchema } from './schemas/user'

export type ORPCContext = { user?: z.infer<typeof UserSchema>; db: any }

const base = os.context<ORPCContext>().use((input, context, meta) => {
  const start = Date.now()

  meta.onFinish(() => {
    // biome-ignore lint/suspicious/noConsole: <explanation>
    console.log(`[${meta.path.join('/')}] ${Date.now() - start}ms`)
  })
})

const authMid = base.middleware((input, context, meta) => {
  if (!context.user) {
    throw new ORPCError({
      code: 'UNAUTHORIZED',
    })
  }

  return {
    context: {
      user: context.user,
    },
  }
})

export const pub = base.contract(contract)
export const authed = base.use(authMid).contract(contract)
