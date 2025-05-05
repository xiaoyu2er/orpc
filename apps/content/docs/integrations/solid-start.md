---
title: SolidStart Integration
description: Integrate oRPC with SolidStart
---

# SolidStart Integration

[SolidStart](https://start.solidjs.com/) is a full stack JavaScript framework for building web applications with SolidJS. For additional context, refer to the [HTTP Adapter](/docs/adapters/http) guide.

## Basic

::: code-group

```ts [src/routes/rpc/[...rest].ts]
import type { APIEvent } from '@solidjs/start/server'
import { RPCHandler } from '@orpc/server/fetch'

const handler = new RPCHandler(router)

async function handle({ request }: APIEvent) {
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
```

```ts [src/routes/rpc/index.ts]
export * from './[...rest]'
```

:::

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
