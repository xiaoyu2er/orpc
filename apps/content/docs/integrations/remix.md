---
title: Remix Integration
description: Integrate oRPC with Remix
---

# Remix Integration

[Remix](https://remix.run/) is a full stack JavaScript framework for building web applications with React. For additional context, refer to the [Fetch Server Integration](/docs/integrations/fetch-server) guide.

## Basic

```ts [app/routes/rpc.$.ts]
import { RPCHandler } from '@orpc/server/fetch'

const handler = new RPCHandler(router)

export async function loader({ request }: LoaderFunctionArgs) {
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  return response ?? new Response('Not Found', { status: 404 })
}
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
