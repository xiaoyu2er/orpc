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
    'x-api-key': context?.something
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
    if (context?.cache)
      return 'GET'
    if (['get', 'find', 'list', 'search'].includes(path.at(-1)!))
      return 'GET'
    return 'POST'
  },
  fetch: (url, init, { context }) =>
    globalThis.fetch(url, { ...init, cache: context?.cache }),
})
```

## Event Source Configuration

Customize the retry logic for event sources using these options:

- **eventSourceMaxNumberOfRetries:** Maximum retry attempts.
- **eventSourceRetryDelay:** Delay between retries.
- **eventSourceRetry:** Function to determine if a retry should occur.

```ts twoslash
import { RPCLink } from '@orpc/client/fetch'

interface ClientContext {
  eventSourceRetry?: boolean
}

const link = new RPCLink<ClientContext>({
  url: 'http://localhost:3000/rpc',
  eventSourceRetry(reconnectOptions, options, path, input) {
    return !options.context?.eventSourceRetry
  }
})
```

:::tip
You should disable event source retries when streaming results from a chatbot AI.
:::
