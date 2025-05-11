---
title: TanStack Start Integration
description: Integrate oRPC with TanStack Start
---

# TanStack Start Integration

[TanStack Start](https://tanstack.com/start) is a full-stack React framework built on [Nitro](https://nitro.build/) and the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). For additional context, see the [HTTP Adapter](/docs/adapters/http) guide.

## Server

You can integrate oRPC with TanStack Start using its [API Routes](https://tanstack.com/start/latest/docs/framework/react/api-routes).

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

On the client, use `createIsomorphicFn` to provide a headers function that works seamlessly with SSR. This enables usage in both server and browser environments.

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

## Optimize SSR

To reduce HTTP requests and improve latency during SSR, you can combine this with a [Server-Side Client](/docs/client/server-side) during SSR. Below is a quick setup, see [Optimize SSR](/docs/best-practices/optimize-ssr) for a more details.

::: code-group

```ts [app/lib/orpc.ts]
import type { RouterClient } from '@orpc/server'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCClient } from '@orpc/client'

declare global {
  var $client: RouterClient<typeof router> | undefined
}

const link = new RPCLink({
  url: () => {
    if (typeof window === 'undefined') {
      throw new Error('RPCLink is not allowed on the server side.')
    }

    return new URL('/rpc', window.location.href)
  },
})

/**
 * Fallback to client-side client if server-side client is not available.
 */
export const client: RouterClient<typeof router> = globalThis.$client ?? createORPCClient(link)
```

```ts [app/lib/orpc.server.ts]
'server only'

import { createRouterClient } from '@orpc/server'
import { getHeaders } from '@tanstack/react-start/server'

globalThis.$client = createRouterClient(router, {
  /**
   * Provide initial context if needed.
   *
   * Because this client instance is shared across all requests,
   * only include context that's safe to reuse globally.
   * For per-request context, use middleware context or pass a function as the initial context.
   */
  context: async () => ({
    headers: getHeaders(),
  }),
})
```

```ts [app/ssr.tsx]
import './lib/orpc.server'

// Rest of the code
```

:::
