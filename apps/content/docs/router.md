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

## Extending Routers

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

## Utilities

### Infer Router Input

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferRouterInputs } from '@orpc/server'

export type Inputs = InferRouterInputs<typeof router>

type FindPlanetInput = Inputs['planet']['find']
```

This snippet automatically extracts the expected input types for each procedure in the router.

### Infer Router Output

```ts twoslash
import type { router } from './shared/planet'
// ---cut---
import type { InferRouterOutputs } from '@orpc/server'

export type Outputs = InferRouterOutputs<typeof router>

type FindPlanetOutput = Outputs['planet']['find']
```

Similarly, this utility infers the output types, ensuring that your application correctly handles the results from each procedure.
