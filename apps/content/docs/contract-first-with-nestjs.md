---
title: Contract-First with NestJS
description: Seamlessly implement oRPC contracts in your NestJS applications.
---

# Contract-First with NestJS

This guide explains how to easily implement [oRPC contracts](/docs/contract-first/define-contract) within your [NestJS](https://nestjs.com/) application using `@orpc/nest`.

## Installation

::: code-group

```sh [npm]
npm install @orpc/nest@latest
```

```sh [yarn]
yarn add @orpc/nest@latest
```

```sh [pnpm]
pnpm add @orpc/nest@latest
```

```sh [bun]
bun add @orpc/nest@latest
```

```sh [deno]
deno install npm:@orpc/nest@latest
```

:::

## Requirements

oRPC is an ESM-only library. Therefore, your NestJS application must be configured to support ESM modules.

1.  **Configure `tsconfig.json`**: with `"module": "NodeNext"` or a similar ESM-compatible option.

    ```json
    {
      "compilerOptions": {
        "module": "NodeNext"
        // ... other options
      }
    }
    ```

2.  **Node.js Environment**:

    - **Node.js 22+**: Recommended, as it allows `require()` of ESM modules natively.
    - **Older Node.js versions**: Alternatively, use a bundler to compile ESM modules (including `@orpc/nest`) to CommonJS.

    ::: warning
    By default, NestJS bundler ([Webpack](https://webpack.js.org/) or [SWC](https://swc.rs/)) might not compile `node_modules`. You may need to adjust your bundler configs to include `@orpc/nest` for compilation.
    :::

## Define Your Contract

Before implementation, define your oRPC contract. This process is consistent with the standard oRPC methodology. For detailed guidance, refer to the main [Contract-First guide](/docs/contract-first/define-contract).

::: details Example Contract

```ts
import { oc } from '@orpc/contract'
import { z } from 'zod'

export const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
})

export const listPlanetContract = oc
  .route({
    method: 'GET',
    path: '/planets' // Path is required for NestJS implementation
  })
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .output(z.array(PlanetSchema))

export const findPlanetContract = oc
  .route({
    method: 'GET',
    path: '/planets/{id}' // Path is required
  })
  .input(PlanetSchema.pick({ id: true }))
  .output(PlanetSchema)

export const createPlanetContract = oc
  .route({
    method: 'POST',
    path: '/planets' // Path is required
  })
  .input(PlanetSchema.omit({ id: true }))
  .output(PlanetSchema)

export const contract = {
  planet: {
    list: listPlanetContract,
    find: findPlanetContract,
    create: createPlanetContract,
  },
}
```

:::

::: warning
For a contract to be implementable in NestJS using `@orpc/nest`, each contract **must** define a `path` in its `.route`. Omitting it will cause a build‑time error.
:::

## Implement Your Contract

```ts
import { Implement, implement, ORPCError } from '@orpc/nest'

@Controller()
export class PlanetController {
  @Implement(contract.planet.list)
  listPlanets() {
    return implement(contract.planet.list).handler(({ input }) => {
      // Implement logic here

      return []
    })
  }

  // other handlers...
}
```

::: info
The `@Implement` decorator functions similarly to NestJS built-in HTTP method decorators (e.g., `@Get`, `@Post`). Handlers decorated with `@Implement` are standard NestJS controller handlers and can leverage all NestJS features.
:::

## Create a Type-Safe Client

When you implement oRPC contracts in NestJS using `@orpc/nest`, the resulting API endpoints are OpenAPI compatible. This allows you to use an OpenAPI-compatible client link, such as [OpenAPILink](/docs/openapi/client/openapi-link), to interact with your API in a type-safe way.

```typescript
import type { JsonifiedClient } from '@orpc/openapi-client'
import type { ContractRouterClient } from '@orpc/contract'
import { createORPCClient } from '@orpc/client'
import { OpenAPILink } from '@orpc/openapi-client/fetch'

const link = new OpenAPILink(contract, {
  url: 'http://localhost:3000',
  headers: () => ({
    'x-api-key': 'my-api-key',
  }),
  // fetch: <-- polyfill fetch if needed
})

const client: JsonifiedClient<ContractRouterClient<typeof contract>> = createORPCClient(link)
```

::: info
Please refer to the [OpenAPILink](/docs/openapi/client/openapi-link) documentation for more information on client setup and options.
:::
