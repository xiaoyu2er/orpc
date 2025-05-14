import type { User } from '../schemas/user'
import { os } from '@orpc/server'

export const requiredAuthMiddleware = os
  .$context<{ session?: { user?: User } }>()
  .middleware(async ({ context, next }) => {
    if (!context.session || !context.session.user) {
      throw new Error('UNAUTHORIZED')
    }

    return next({
      context: { user: context.session.user },
    })
  })
