---
title: TanStack Start Integration
description: Integrate oRPC with TanStack Start
---

# TanStack Start Integration

[TanStack Start](https://tanstack.com/start) is a full-stack React framework built on [Nitro](https://nitro.build/) and the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). For additional context, see the [HTTP Adapter](/docs/adapters/http) guide.

## Server

You can integrate oRPC handlers with TanStack Start using its [API Routes](https://tanstack.com/start/latest/docs/framework/react/api-routes).

::: code-group

```ts [app/routes/api/rpc.$.ts]
import { RPCHandler } from '@orpc/server/fetch'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const handler = new RPCHandler(router)

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: '/api/rpc',
    context: {}, // Provide initial context if needed
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const APIRoute = createAPIFileRoute('/api/rpc/$')({
  HEAD: handle,
  GET: handle,
  POST: handle,
  PUT: handle,
  PATCH: handle,
  DELETE: handle,
})
```

```ts [app/routes/api/rpc.ts]
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { APIRoute as BaseAPIRoute } from './rpc.$'

export const APIRoute = createAPIFileRoute('/api/rpc')(BaseAPIRoute.methods)
```

:::

::: info
The `handler` can be any supported oRPC handler, including [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or a custom handler.
:::

## Client

In client you can use `createIsomorphicFn` to create a header function that friendly with SSR. now your client can use use both on server and client.

```ts
import { getHeaders } from '@tanstack/react-start/server'
import { createIsomorphicFn } from '@tanstack/react-start'

const link = new RPCLink({
  url: new URL('/api/rpc', typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'),
  headers: createIsomorphicFn()
    .client(() => ({}))
    .server(() => getHeaders())
})
```

:::info
This only shows how to configure the link. For full client examples, see [Client-Side Clients](/docs/client/client-side).
:::
