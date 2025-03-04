---
title: RPCLink
description: Details on using RPCLink in oRPC clients.
---

# RPCLink

RPCLink enables communication with an [RPCHandler](/docs/rpc-handler) on your server using HTTP/Fetch.

## Overview

Before using RPCLink, ensure your server is running an [RPCHandler](/docs/rpc-handler).

```ts
import { RPCLink } from '@orpc/client/fetch'

const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    'x-api-key': 'my-api-key'
  }),
  // fetch: <-- polyfill fetch if needed
})

export const client: RouterClient<typeof router> = createORPCClient(link)
```

## Using Client Context

Client context lets you pass extra information when calling procedures and dynamically modify RPCLink’s behavior.

```ts twoslash
import { router } from './shared/planet'
import { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

interface ClientContext {
  something?: string
}

const link = new RPCLink<ClientContext>({
  url: 'http://localhost:3000/rpc',
  headers: async ({ context }) => ({
    'x-api-key': context?.something ?? ''
  })
})

const client: RouterClient<typeof router, ClientContext> = createORPCClient(link)

const result = await client.planet.list(
  { limit: 10 },
  { context: { something: 'value' } }
)
```

:::info
If a property in `ClientContext` is required, oRPC enforces its inclusion when calling procedures.
:::

## Custom Request Method

By default, RPCLink sends requests via `POST`. You can override this to use methods like `GET` (for browser or CDN caching) based on your requirements.

```ts twoslash
import { RPCLink } from '@orpc/client/fetch'

interface ClientContext {
  cache?: RequestCache
}

const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
  method: ({ context }, path) => {
    if (context?.cache) {
      return 'GET'
    }

    if (['get', 'find', 'list', 'search'].includes(path.at(-1)!)) {
      return 'GET'
    }

    return 'POST'
  },
  fetch: (request, init, { context }) => globalThis.fetch(request, {
    ...init,
    cache: context?.cache,
  }),
})
```

## Event Iterator Configuration

Customize the retry logic for [Event Iterator](/docs/event-iterator) using these options:

- **eventIteratorMaxRetries:** Maximum retry attempts.
- **eventIteratorRetryDelay:** Delay between retries.
- **eventIteratorShouldRetry:** Function to determine if a retry should occur.

```ts twoslash
import { RPCLink } from '@orpc/client/fetch'

interface ClientContext {
  eventIteratorShouldRetry?: boolean
}

const link = new RPCLink<ClientContext>({
  url: 'http://localhost:3000/rpc',
  eventIteratorShouldRetry(reconnectOptions, options, path, input) {
    console.log(reconnectOptions.error)

    return !options.context?.eventIteratorShouldRetry
  }
})
```

:::tip
You should disable event iterator retries when streaming results from a chatbot AI.
:::

## Event-Source Ping Interval

To keep EventSource connections alive (the mechanism behind [Event Iterator](/docs/event-iterator)), `RPCLink` periodically sends a ping comment to the server. You can configure this behavior using the following options:

- `eventSourcePingEnabled` (default: `true`) – Enables or disables pings.
- `eventSourcePingInterval` (default: `5000`) – Time between pings (in milliseconds).
- `eventSourcePingContent` (default: `''`) – Custom content for ping messages.

```ts
const link = new RPCLink({
  eventSourcePingEnabled: true,
  eventSourcePingInterval: 5000, // 5 seconds
  eventSourcePingContent: '',
})
```

:::warning
These options for sending [Event Iterator](/docs/event-iterator) from client to the server, not from the server to client as used in [RPCHandler](/docs/rpc-handler#event-source-ping-interval) or [OpenAPIHandler](/docs/openapi/openapi-handler#event-source-ping-interval).
:::
