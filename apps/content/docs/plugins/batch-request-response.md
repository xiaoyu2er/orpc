---
title: Batch Request/Response Plugin
description: A plugin for oRPC to batch requests and responses.
---

# Batch Request/Response Plugin

The **Batch Request/Response Plugin** allows you to combine multiple requests and responses into a single batch, reducing the overhead of sending each one separately.

:::info
The **Batch Plugin** streams responses asynchronously so that no individual request blocks another, ensuring all responses are handled independently for faster, more efficient batching.
:::

## Setup

This plugin requires configuration on both the server and client sides.

### Server

```ts twoslash
import { RPCHandler } from '@orpc/server/fetch'
import { router } from './shared/planet'
// ---cut---
import { BatchHandlerPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin()],
})
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler) or [OpenAPIHandler](/docs/openapi/openapi-handler). Note that this plugin uses its own protocol for batching requests and responses, which is different from the handler’s native protocol.
:::

### Client

To use the `BatchLinkPlugin`, define at least one group. Requests within the same group will be batched together, and each group requires a `context` as described in [client context](/docs/client/rpc-link#using-client-context).

```ts twoslash
import { RPCLink } from '@orpc/client/fetch'
import { BatchLinkPlugin } from '@orpc/client/plugins'
// ---cut---
const link = new RPCLink({
  url: 'https://api.example.com/rpc',
  plugins: [
    new BatchLinkPlugin({
      groups: [
        {
          condition: options => true,
          context: {}
        }
      ]
    }),
  ],
})
```

## Limitations

The plugin does not support [AsyncIteratorObject](/docs/rpc-handler#supported-data-types) or [File/Blob](/docs/rpc-handler#supported-data-types) in responses (requests will auto fall back to the default behavior). To exclude unsupported procedures, use the `exclude` option:

```ts twoslash
import { RPCLink } from '@orpc/client/fetch'
import { BatchLinkPlugin } from '@orpc/client/plugins'
// ---cut---
const link = new RPCLink({
  url: 'https://api.example.com/rpc',
  plugins: [
    new BatchLinkPlugin({
      groups: [
        {
          condition: options => true,
          context: {}
        }
      ],
      exclude: ({ path }) => {
        return ['planets/getImage', 'planets/subscribe'].includes(path.join('/'))
      }
    }),
  ],
})
```

## Request Headers

By default, oRPC uses the headers appear in all requests in the batch. To customize headers, use the `headers` option:

```ts twoslash
import { RPCLink } from '@orpc/client/fetch'
import { BatchLinkPlugin } from '@orpc/client/plugins'
// ---cut---
const link = new RPCLink({
  url: 'https://api.example.com/rpc',
  plugins: [
    new BatchLinkPlugin({
      groups: [
        {
          condition: options => true,
          context: {}
        }
      ],
      headers: () => ({
        authorization: 'Bearer 1234567890',
      })
    }),
  ],
})
```

## Response Headers

By default, the response headers is empty. To customize headers, use the `headers` option:

```ts twoslash
import { RPCHandler } from '@orpc/server/fetch'
import { router } from './shared/planet'
// ---cut---
import { BatchHandlerPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin({
    headers: responses => ({
      'some-header': 'some-value',
    })
  })],
})
```
