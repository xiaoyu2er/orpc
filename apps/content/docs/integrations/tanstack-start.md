---
title: TanStack Start Integration
description: Integrate oRPC with TanStack Start
---

# TanStack Start Integration

[TanStack Start](https://tanstack.com/start) is a full-stack React framework. It built on top of [Nitro](https://nitro.dev/) and [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). For additional context, refer to the [Fetch Server Integration](/docs/integrations/fetch-server) guide.

## Basic

::: code-group

```ts [app/routes/api/rpc.$.ts]
import { RPCHandler } from '@orpc/server/fetch'
import { createAPIFileRoute } from '@tanstack/start/api'

const handler = new RPCHandler(router)

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const APIRoute = createAPIFileRoute('/api/rpc/$')({
  GET: handle,
  POST: handle,
  PUT: handle,
  PATCH: handle,
  DELETE: handle,
})
```

```ts [app/routes/api/rpc.ts]
import { createAPIFileRoute } from '@tanstack/start/api'
import { APIRoute as BaseAPIRoute } from './rpc.$'

export const APIRoute = createAPIFileRoute('/api/rpc')(BaseAPIRoute.methods)
```

:::

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
