---
title: WebSocket Integration
description: Integrating oRPC with WebSocket
---

# WebSocket Integration

WebSocket is a lightweight, full-duplex protocol that enables real-time communication between a client and a server. oRPC includes first-class support for WebSocket out of the box, giving you low latency and high throughput.

## Server

### Imports

```ts
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/crossws'
```

oRPC provides an adapter for [Crossws](https://github.com/h3js/crossws), which works in numerous JavaScript environments.

### Example with Bun

```ts
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/crossws'
import crossws from 'crossws/adapters/bun'

const handler = new RPCHandler(router)

const ws = crossws({
  hooks: {
    message: (peer, message) => {
      handler.message(peer, message, {
        context: {}, // Optional initial context
      })
    },
    close: (peer) => {
      handler.close(peer)
    },
  },
})

Bun.serve({
  port: 3000,
  websocket: ws.websocket,
  fetch(request, server) {
    if (request.headers.get('upgrade') === 'websocket') {
      return ws.handleUpgrade(request, server)
    }

    return new Response('Not Found', { status: 404 })
  },
})
```

:::info
This example uses the [Crossws](https://github.com/h3js/crossws) adapter and Bun, but you can swap in any other supported environment adapter.
:::

## Client

### Imports

```ts
import { experimental_RPCLink as RPCLink } from '@orpc/client/websocket'
```

oRPC provides a standard WebSocket adapter that works everywhere the native [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) API available.

### Basic Setup

```ts
import { experimental_RPCLink as RPCLink } from '@orpc/client/websocket'

const websocket = new WebSocket('ws://localhost:3000')
const link = new RPCLink({
  websocket
})
```

:::info
This snippet only covers setting up the `RPCLink`. For complete client usage, see [Client-Side Clients](/docs/client/client-side).
:::

:::info
For automatic reconnect logic, consider using a library like [partysocket](https://www.npmjs.com/package/partysocket).
:::
