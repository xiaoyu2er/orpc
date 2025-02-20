---
title: Middleware
description: Understanding middleware in oRPC
---

# Middleware in oRPC

Middleware is a powerful feature in oRPC that enables reusable and extensible procedures. It allows you to:

- Intercept, hook into, or listen to a handler's execution.
- Inject or guard the execution context.

## Overview

Middleware is a function that takes a `next` function as a parameter and either returns the result
of `next` or modifies the result before returning it.

```ts twoslash
import { os } from '@orpc/server'

const authMiddleware = os.middleware(async ({ context, next }) => {
  // Execute logic before the handler

  const result = await next({
    context: { // Pass additional context
      user: { id: 1, name: 'John' }
    }
  })

  // Execute logic after the handler

  return result
})

const example = os
  .use(authMiddleware)
  .handler(async ({ context }) => {
    const user = context.user
  })
```

Learn more about [context](/docs/context).

## Inline Middleware

Middleware can be defined inline within `.use`, which is useful for simple middleware functions.

```ts
const example = os
  .use(async ({ context, next }) => {
    // Execute logic before the handler
    return next()
  })
  .handler(async ({ context }) => {
    // Handler logic
  })
```

## Middleware Input

Middleware can access input, enabling use cases like permission checks.

```ts
const canUpdate = os.middleware(async ({ context, next }, input: number) => {
  // Perform permission check
  return next()
})

const ping = os
  .input(z.number())
  .use(canUpdate)
  .handler(async ({ input }) => {
    // Handler logic
  })

// Mapping input if necessary
const pong = os
  .input(z.object({ id: z.number() }))
  .use(canUpdate, input => input.id)
  .handler(async ({ input }) => {
    // Handler logic
  })
```

## Middleware Output

Middleware can also modify the output of a handler, such as implementing caching mechanisms.

```ts
const cacheMid = os.middleware(async ({ context, next, path }, input, output) => {
  const cacheKey = path.join('/') + JSON.stringify(input)

  if (db.has(cacheKey)) {
    return output(db.get(cacheKey))
  }

  const result = await next({})

  db.set(cacheKey, result.output)

  return result
})
```

## Concatenation

Multiple middleware functions can be combined using `.concat`.

```ts
const concatMiddleware = aMiddleware
  .concat(os.middleware(async ({ next }) => next()))
  .concat(anotherMiddleware)
```
