---
title: Router
description: Understanding routers in oRPC
---

# Router in oRPC

Routers in oRPC are simple, nestable objects composed of procedures. They can also modify their own procedures, offering flexibility and modularity when designing your API.

## Overview

Routers are defined as plain JavaScript objects where each key corresponds to a procedure. For example:

```ts
import { os } from '@orpc/server'

const ping = os.handler(async () => 'ping')
const pong = os.handler(async () => 'pong')

const router = {
  ping,
  pong,
  nested: { ping, pong }
}
```

## Extending Router

Routers can be modified to include additional features. For example, to require authentication on all procedures:

```ts
const router = os.use(requiredAuth).router({
  ping,
  pong,
  nested: {
    ping,
    pong,
  }
})
```

## Lazy Router

In oRPC, routers can be lazy-loaded, making them ideal for code splitting and enhancing cold start performance. Lazy loading allows you to defer the initialization of routes until they are actually needed, which reduces the initial load time and improves resource management.

::: code-group

```ts [router.ts]
const router = {
  ping,
  pong,
  planet: os.lazy(() => import('./planet'))
}
```

```ts [planet.ts]
const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
})

export const listPlanet = os
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ input }) => {
    // your list code here
    return [{ id: 1, name: 'name' }]
  })

export default {
  list: listPlanet,
  // ...
}
```

:::

## Utilities

> **Note:** Every [procedure](/docs/procedure) is also a router, so you can apply these utilities to procedures as well.

### Infer Router Inputs

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferRouterInputs } from '@orpc/server'

export type Inputs = InferRouterInputs<typeof router>

type FindPlanetInput = Inputs['planet']['find']
```

Infers the expected input types for each procedure in the router.

### Infer Router Outputs

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferRouterOutputs } from '@orpc/server'

export type Outputs = InferRouterOutputs<typeof router>

type FindPlanetOutput = Outputs['planet']['find']
```

Infers the expected output types for each procedure in the router.

### Infer Router Initial Contexts

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferRouterInitialContexts } from '@orpc/server'

export type InitialContexts = InferRouterInitialContexts<typeof router>

type FindPlanetInitialContext = InitialContexts['planet']['find']
```

Infers the [initial context](/docs/context#initial-context) types defined for each procedure.

### Infer Router Current Contexts

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferRouterCurrentContexts } from '@orpc/server'

export type CurrentContexts = InferRouterCurrentContexts<typeof router>

type FindPlanetCurrentContext = CurrentContexts['planet']['find']
```

Infers the [current context](/docs/context#combining-initial-and-execution-context) types, which combine the initial context with the execution context and pass it to the handler.
