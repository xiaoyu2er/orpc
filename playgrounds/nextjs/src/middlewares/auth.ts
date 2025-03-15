import type { User } from '@/schemas/user'
import { os } from '@orpc/server'

/**
 * Best practices for dedupe-middlewares
 * {@link https://orpc.unnoq.com/docs/best-practices/dedupe-middleware}
 */
export const requiredAuthMiddleware = os
  .$context<{ user?: User }>()
  .middleware(({ context, next }) => {
    if (context.user) {
      return next({
        context: { user: context.user },
      })
    }

    /**
     * You can use headers or cookies here to create the user object:
     * import { cookies, headers } from 'next/headers'
     * const headerList = await headers();
     * const cookieList = await cookies();
     *
     * These lines are commented out because Stackblitz has issues with Next.js headers and cookies.
     * However, this works fine in a local environment.
     */

    const user: User = { id: 'unique', name: 'unnoq', email: 'contact@unnoq.com' }

    return next({
      context: { user },
    })
  })
