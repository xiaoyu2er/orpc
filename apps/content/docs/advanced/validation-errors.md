---
title: Validation Errors
description: Learn about oRPC's built-in validation errors and how to customize them.
---

# Validation Errors

oRPC provides built-in validation errors that work well by default. However, you might sometimes want to customize them.

## Customizing with Middleware

```ts twoslash
import { z } from 'zod'
// ---cut---
import { ORPCError, os, ValidationError } from '@orpc/server'

const base = os.use(async ({ next }) => {
  try {
    return await next()
  }
  catch (error) {
    // Customize input validation errors
    if (
      error instanceof ORPCError
      && error.code === 'BAD_REQUEST'
      && error.cause instanceof ValidationError
    ) {
      throw new ORPCError('BAD_REQUEST', { // Customize your error
        data: { issues: error.cause.issues },
        cause: error.cause,
      })
    }

    // Customize output validation errors
    if (
      error instanceof ORPCError
      && error.code === 'INTERNAL_SERVER_ERROR'
      && error.cause instanceof ValidationError
    ) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', { // Customize your error
        cause: error.cause,
      })
    }

    throw error
  }
})

const getting = base
  .input(z.object({ id: z.string().uuid() }))
  .output(z.object({ id: z.string().uuid(), name: z.string() }))
  .handler(async ({ input }) => {
    return { id: input.id, name: 'name' }
  })
```

Every [procedure](/docs/procedure) built from `base` now uses these customized validation errors.

:::warning
Middleware applied before `.input`/`.output` catches validation errors by default, but this behavior can be configured.
:::
