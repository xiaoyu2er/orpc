---
title: Elysia Integration
description: Integrate oRPC with Elysia
---

# Elysia Integration

[Elysia](https://elysiajs.com/) is a high-performance web framework for [Bun](https://bun.sh/) that adheres to the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). For additional context, refer to the [Fetch Server Integration](/docs/integrations/fetch-server) guide.

## Example

```ts
import { Elysia } from 'elysia'
import { OpenAPIHandler } from '@orpc/openapi/fetch'

const handler = new OpenAPIHandler(router)

const app = new Elysia()
  .all('/rpc*', async ({ request }: { request: Request }) => {
    const { response } = await handler.handle(request, {
      prefix: '/rpc',
    })

    return response ?? new Response('Not Found', { status: 404 })
  })
  .listen(3000)

console.log(
  `🦊 Elysia is running at http://localhost:3000`
)
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
