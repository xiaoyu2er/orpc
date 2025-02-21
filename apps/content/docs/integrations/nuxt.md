---
title: Nuxt.js Integration
description: Integrate oRPC with Nuxt.js
---

# Nuxt.js Integration

[Nuxt.js](https://nuxtjs.org/) is a popular Vue.js framework for building server-side applications. It built on top of [Nitro](https://nitro.dev/) server a lightweight, high-performance Node.js runtime. For more details, see the [Node Integration](/docs/integrations/node) guide.

## Example

```ts
// server/routes/rpc/[...].ts and server/routes/rpc.ts
import { RPCHandler } from '@orpc/server/node'

const rpcHandler = new RPCHandler(router)

export default defineEventHandler(async (event) => {
  const { matched } = await rpcHandler.handle(event.node.req, event.node.res, {
    prefix: '/rpc',
    context: {}, // Provide initial context if needed
  })

  if (matched) {
    return
  }

  event.node.res.statusCode = 404
  event.node.res.end('Not found')
})
```

> Both the `server/routes/rpc/[...].ts` and `server/routes/rpc.ts` files should use the same implementation logic to ensure consistent behavior.

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
