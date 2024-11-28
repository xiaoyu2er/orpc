import type { z } from 'zod'
import type { UserSchema } from './schemas/user'
import { ORPCError, os } from '@orpc/server'
import { cookies, headers } from 'next/headers'
import './polyfill'

const base = os.use(async (input, context, meta) => {
  const headerList = await headers()
  let user = headerList.get('Authorization')
    ? { id: 'test', name: 'John Doe', email: 'john@doe.com' } satisfies z.infer<typeof UserSchema>
    : undefined

  if (!user) {
    const cookieList = await cookies()
    // do something with cookies
    user = { id: 'test', name: 'John Doe', email: 'john@doe.com' }
  }

  return meta.next({
    context: {
      db: 'dummy:postgres',
      user,
    },
  })
})

export const pub = base.use(async (input, context, meta) => {
  const start = Date.now()

  try {
    return await meta.next({})
  }
  finally {
    // eslint-disable-next-line no-console
    console.log(`[${meta.path.join('/')}] ${Date.now() - start}ms`)
  }
})

export const authed = pub.use(async (input, context, meta) => {
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
