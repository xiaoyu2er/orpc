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

::: info
These utilities can be used for both procedures and routers.
:::

### Infer Inputs

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferInputs } from '@orpc/server'

export type Inputs = InferInputs<typeof router>

type FindPlanetInput = Inputs['planet']['find']
```

Infers the expected input types for each procedure in the router.

### Infer Outputs

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferOutputs } from '@orpc/server'

export type Outputs = InferOutputs<typeof router>

type FindPlanetOutput = Outputs['planet']['find']
```

Infers the expected output types for each procedure in the router.

### Infer Initial Contexts

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferInitialContexts } from '@orpc/server'

export type InitialContexts = InferInitialContexts<typeof router>

type FindPlanetInitialContext = InitialContexts['planet']['find']
```

Infers the [initial context](/docs/context#initial-context) types defined for each procedure.

### Infer Router Current Contexts

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferCurrentContexts } from '@orpc/server'

export type CurrentContexts = InferCurrentContexts<typeof router>

type FindPlanetCurrentContext = CurrentContexts['planet']['find']
```

Infers the [current context](/docs/context#combining-initial-and-execution-context) types, which combine the initial context with the execution context and pass it to the handler.
