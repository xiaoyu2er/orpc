---
title: Hono Adapter
description: Use oRPC inside an Hono project
---

# Hono Adapter

[Hono](https://honojs.dev/) is a high-performance web framework built on top of [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). For additional context, refer to the [HTTP Adapter](/docs/adapters/http) guide.

## Basic

```ts
import { Hono } from 'hono'
import { RPCHandler } from '@orpc/server/fetch'

const app = new Hono()

const handler = new RPCHandler(router)

app.use('/rpc/*', async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return c.newResponse(response.body, response)
  }

  await next()
})

export default app
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
