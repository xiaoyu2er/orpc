---
Title: Dedupe Middleware
Description: Improve performance and ensure safety when running oRPC middleware multiple times.
---

# Dedupe Middleware

This guide explains how to optimize your [middleware](/docs/middleware) so it remains fast, efficient, and safe even when executed multiple times.

## Problem

When a procedure [calls](/docs/client/server-side#using-the-call-utility) another procedure, overlapping middleware might be applied in both.

Similarly, when using `.use(auth).router(router)`, some procedures inside `router` might already include the `auth` middleware.

:::warning
This duplication can lead to repeated execution of middleware, causing unexpected behaviors or performance issues, especially if the middleware is resource-intensive.
:::

## Solution

The solution is to use the `context` to track which middleware has already run. For example:

```ts twoslash
import { os } from '@orpc/server'
declare function connectDb(): Promise<'a_fake_db'>
// ---cut---
const dbProvider = os
  .$context<{ db?: Awaited<ReturnType<typeof connectDb>> }>()
  .middleware(async ({ context, next }) => {
    if (context.db) {
      return next({ context: { db: context.db } })
    }

    const db = await connectDb()
    return next({ context: { db } })
  })
```

In this example, the `dbProvider` middleware checks if a database connection already exists in the `context`. If it does, it simply passes the context along; if not, it establishes a connection and saves it in the `context`.

This middleware can now be safely applied multiple times:

```ts twoslash
import { call, os } from '@orpc/server'

declare function connectDb(): Promise<'a_fake_db'>
const dbProvider = os
  .$context<{ db?: Awaited<ReturnType<typeof connectDb>> }>()
  .middleware(async ({ context, next }) => {
    if (context.db) {
      return next({ context: { db: context.db } })
    }

    const db = await connectDb()
    return next({ context: { db } })
  })
// ---cut---
const foo = os.use(dbProvider).handler(({ context }) => 'Hello World')

const bar = os.use(dbProvider).handler(({ context }) => call(foo, { context }))

const router = os
  .use(dbProvider)
  .use(({ next }) => {
    // Additional middleware logic
    return next()
  })
  .router({
    foo,
    bar,
  })
```

Even when `dbProvider` is used multiple times, the middleware efficiently ensures that the database connection is established only once, preserving both correctness and performance.

## Conclusion

This recommended pattern leverages the context to prevent duplicate middleware execution, ensuring both efficiency and safety. We believe this approach is highly effective, and when writing middleware, you should keep this pattern in mind to avoid unnecessary overhead and potential performance issues.
