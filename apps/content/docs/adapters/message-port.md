---
title: Message Port
description: Using oRPC with Message Ports
---

# Message Port

oRPC offers built-in support for common Message Port implementations, enabling easy internal communication between different processes.

| Environment                                                                                                                 | Documentation                                             |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [Electron Message Port](https://www.electronjs.org/docs/latest/tutorial/message-ports)                                      | [Integration Guide](/docs/integrations/electron)          |
| [Browser Extension Long-lived Connections](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#connect) | [Integration Guide](/docs/integrations/browser-extension) |
| [Node.js Worker Threads Port](https://nodejs.org/api/worker_threads.html#workerparentport)                                  | [Integration Guide](/docs/integrations/worker-threads)    |

## Basic Usage

Message Ports work by establishing two endpoints that can communicate with each other:

```ts [bridge]
const channel = new MessageChannel()
const serverPort = channel.port1
const clientPort = channel.port2
```

```ts [server]
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/message-port'

const handler = new RPCHandler(router)

handler.upgrade(serverPort, {
  context: {}, // Optionally provide an initial context
})
```

```ts [client]
import { experimental_RPCLink as RPCLink } from '@orpc/client/message-port'

const link = new RPCLink({
  port: clientPort,
})
```

:::info
This only shows how to configure the link. For full client examples, see [Client-Side Clients](/docs/client/client-side).
:::
