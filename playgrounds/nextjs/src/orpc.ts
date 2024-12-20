import type { z } from 'zod'
import type { UserSchema } from './schemas/user'
import { ORPCError, os } from '@orpc/server'
import './polyfill'

const base = os
  .use(async (input, context, meta) => {
    const start = Date.now()

    try {
      return await meta.next({})
    }
    catch (e) {
      console.error(e)
      throw e
    }
    finally {
      // eslint-disable-next-line no-console
      console.log(`[${meta.path.join('/')}] ${Date.now() - start}ms`)
    }
  })
  .use(async (input, context, meta) => {
    // You can use headers or cookies here to create the user object:
    // import { cookies, headers } from 'next/headers'
    // const headerList = await headers();
    // const cookieList = await cookies();
    //
    // These lines are commented out because Stackblitz has issues with Next.js headers and cookies.
    // However, this works fine in a local environment.

    const user = { id: 'test', name: 'John Doe', email: 'john@doe.com' } satisfies z.infer<typeof UserSchema>

    return meta.next({
      context: {
        db: 'dummy:postgres',
        user,
      },
    })
  })

export const pub = base

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
