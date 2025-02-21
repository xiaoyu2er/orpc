---
title: Next.js Integration
description: Seamlessly integrate oRPC with Next.js
---

# Next.js Integration

[Next.js](https://nextjs.org/) is a leading React framework for server-rendered apps. oRPC works with both the [App Router](https://nextjs.org/docs/app/getting-started/installation) and [Pages Router](https://nextjs.org/docs/pages/getting-started/installation). For additional context, refer to the [Node Integration](/docs/integrations/node) and [Fetch Server Integration](/docs/integrations/fetch-server) guides.

::: info
oRPC also supports [Server Action](/docs/server-action) out-of-the-box.
:::

## App Router

```ts
// app/rpc/[[...rest]].ts
import { RPCHandler, serve } from '@orpc/server/next'

const handler = new RPCHandler(router)

export const { GET, POST, PUT, PATCH, DELETE } = serve(handler, {
  prefix: '/rpc',
  context: async (req) => {
    return {} // Provide initial context if needed
  },
})
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::

## Pages Router

```ts
// pages/rpc/[[...rest]].ts
import { RPCHandler } from '@orpc/server/node'

const handler = new RPCHandler(router)

export default async (req, res) => {
  const { matched } = await handler.handle(req, res, {
    prefix: '/rpc',
    context: {}, // Provide initial context if needed
  })

  if (matched) {
    return
  }

  res.statusCode = 404
  res.end('Not found')
}
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
