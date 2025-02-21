---
title: Server-Side Clients
description: Call your oRPC procedures in the same environment as your server like native functions.
---

# Server-Side Clients

Call your [procedures](/docs/procedure) in the same environment as your server—no proxies required like native functions.

## Calling Procedures

oRPC offers multiple methods to invoke a [procedure](/docs/procedure).

### Using `.callable`

Define your procedure and turn it into a callable procedure:

```ts twoslash
import { os } from '@orpc/server'
import { z } from 'zod'

const getProcedure = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => ({ id: input.id }))
  .callable({
    context: {} // Provide initial context if needed
  })

const result = await getProcedure({ id: '123' })
```

### Using the `call` Utility

Alternatively, call your procedure using the `call` helper:

```ts twoslash
import { z } from 'zod'
import { call, os } from '@orpc/server'

const getProcedure = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => ({ id: input.id }))

const result = await call(getProcedure, { id: '123' }, {
  context: {} // Provide initial context if needed
})
```

## Router Client

Create a [router](/docs/router) based client to access multiple procedures:

```ts twoslash
import { z } from 'zod'
// ---cut---
import { createRouterClient, os } from '@orpc/server'

const ping = os.handler(() => 'pong')
const pong = os.handler(() => 'ping')

const client = createRouterClient({ ping, pong }, {
  context: {} // Provide initial context if needed
})

const result = await client.ping()
```
