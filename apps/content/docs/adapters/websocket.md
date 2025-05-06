---
title: Websocket
description: How to use oRPC over WebSocket?
---

# Websocket

oRPC provides built-in WebSocket support for low-latency, bidirectional RPC.

## Server Adapters

| Adapter     | Target                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `websocket` | [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) (Browser, Deno, Cloudflare, etc.) |
| `crossws`   | [Crossws](https://github.com/h3js/crossws) library (Node, Bun, Deno, SSE, etc.)                                   |
| `ws`        | [ws](https://github.com/websockets/ws) library (Node.js)                                                          |
| `bun-ws`    | [Bun Websocket Server](https://bun.sh/docs/api/websockets)                                                        |

::: code-group

```ts [websocket]
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/websocket'

const handler = new RPCHandler(router)

Deno.serve((req) => {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response(null, { status: 501 })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)

  handler.upgrade(socket, {
    context: {}, // Provide initial context if needed
  })

  return response
})
```

```ts [crossws]
import { createServer } from 'node:http'
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/crossws'

// any crossws adapter is supported
import crossws from 'crossws/adapters/node'

const handler = new RPCHandler(router)

const ws = crossws({
  hooks: {
    message: (peer, message) => {
      handler.message(peer, message, {
        context: {}, // Provide initial context if needed
      })
    },
    close: (peer) => {
      handler.close(peer)
    },
  },
})

const server = createServer((req, res) => {
  res.end(`Hello World`)
}).listen(3000)

server.on('upgrade', (req, socket, head) => {
  if (req.headers.upgrade === 'websocket') {
    ws.handleUpgrade(req, socket, head)
  }
})
```

```ts [ws]
import { WebSocketServer } from 'ws'
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/ws'

const handler = new RPCHandler(router)

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  handler.upgrade(ws, {
    context: {}, // Provide initial context if needed
  })
})
```

```ts [bun-ws]
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/bun-ws'

const handler = new RPCHandler(router)

Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) {
      return
    }

    return new Response('Upgrade failed', { status: 500 })
  },
  websocket: {
    message(ws, message) {
      handler.message(ws, message, {
        context: {}, // Provide initial context if needed
      })
    },
    close(ws) {
      handler.close(ws)
    },
  },
})
```

:::

## Client Adapters

| Adapter     | Target                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `websocket` | [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) (Browser, Node, Bun, Deno, etc.) |

```ts
import { experimental_RPCLink as RPCLink } from '@orpc/client/websocket'

const websocket = new WebSocket('ws://localhost:3000')

const link = new RPCLink({
  websocket
})
```

::: tip
Use [partysocket](https://www.npmjs.com/package/partysocket) library for manually/automatically reconnect logic.
:::

:::info
This only shows how to configure the WebSocket link. For full client examples, see [Client-Side Clients](/docs/client/client-side).
:::
