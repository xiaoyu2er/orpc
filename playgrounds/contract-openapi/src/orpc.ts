import { os, ORPCError } from '@orpc/server'
import type { z } from 'zod'
import { contract } from './contract'
import type { UserSchema } from './schemas/user'

export type ORPCContext = { user?: z.infer<typeof UserSchema>; db: any }

const osBase = os.context<ORPCContext>().use((input, context, meta) => {
  const start = Date.now()

  meta.onFinish(() => {
    // biome-ignore lint/suspicious/noConsole: <explanation>
    console.log(`[${meta.path.join('/')}] ${Date.now() - start}ms`)
  })
})

const authedBase = osBase.use((input, context, meta) => {
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

export const osw = osBase.contract(contract)
export const authed = authedBase.contract(contract)
