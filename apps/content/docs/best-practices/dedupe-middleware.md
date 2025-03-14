---
title: Dedupe Middleware
description: Enhance oRPC middleware performance by avoiding redundant executions.
---

# Dedupe Middleware

This guide explains how to optimize your [middleware](/docs/middleware) for fast and efficient repeated execution.

## Problem

When a procedure [calls](/docs/client/server-side#using-the-call-utility) another procedure, overlapping middleware might be applied in both.

Similarly, when using `.use(auth).router(router)`, some procedures inside `router` might already include the `auth` middleware.

:::warning
Redundant middleware execution can hurt performance, especially if the middleware is resource-intensive.
:::

## Solution

Use the `context` to track middleware execution and prevent duplication. For example:

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

    return next({ context: { db: await connectDb() } })
  })
```

Now `dbProvider` middleware can be safely applied multiple times without duplicating the database connection:

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

const bar = os.use(dbProvider).handler(({ context }) => {
  const result = call(foo, 'input', { context })
  return 'Hello World'
})

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

## Built-in Dedupe Middleware

oRPC can automatically dedupe some middleware under specific conditions.

::: info
Deduplication occurs only if the router middlewares is a **subset** of the **leading** procedure middlewares and appears in the **same order**.
:::

```ts
const router = os.use(logging).use(dbProvider).router({
  ping: os.use(logging).use(dbProvider).use(auth).handler(({ context }) => 'ping'),
  pong: os.use(logging).use(dbProvider).handler(({ context }) => 'pong'),

  // ⛔ Deduplication does not occur:
  diff_subset: os.use(logging).handler(({ context }) => 'ping'),
  diff_order: os.use(dbProvider).use(logging).handler(({ context }) => 'pong'),
  diff_leading: os.use(monitor).use(logging).use(dbProvider).handler(({ context }) => 'bar'),
})

// --- equivalent to ---

const router = {
  ping: os.use(logging).use(dbProvider).use(auth).handler(({ context }) => 'ping'),
  pong: os.use(logging).use(dbProvider).handler(({ context }) => 'pong'),

  // ⛔ Deduplication does not occur:
  diff_subset: os.use(logging).use(dbProvider).use(logging).handler(({ context }) => 'ping'),
  diff_order: os.use(logging).use(dbProvider).use(dbProvider).use(logging).handler(({ context }) => 'pong'),
  diff_leading: os.use(logging).use(dbProvider).use(monitor).use(logging).use(dbProvider).handler(({ context }) => 'bar'),
}
```

### Configuration

Disable middleware deduplication by setting `dedupeLeadingMiddlewares` to `false` in `.$config`:

```ts
const base = os.$config({ dedupeLeadingMiddlewares: false })
```

:::warning
The deduplication behavior is safe unless you want to apply middleware multiple times.
:::
