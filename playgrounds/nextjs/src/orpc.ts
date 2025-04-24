import { os } from '@orpc/server'
import { dbProviderMiddleware } from './middlewares/db'
import { requiredAuthMiddleware } from './middlewares/auth'
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'

export const pub = os
  .$context<{ headers: ReadonlyHeaders }>()
  .use(async ({ context, next }) => {
    console.log({ userAgent: context.headers.get('user-agent') })

    return next()
  })
  .use(dbProviderMiddleware)

export const authed = pub
  .use(requiredAuthMiddleware)
