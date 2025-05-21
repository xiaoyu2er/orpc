---
title: Worker Threads Integration
description: Enable type-safe communication between Node.js Worker Threads using oRPC.
---

# Worker Threads Integration

Use [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html) with oRPC for type-safe inter-thread communication via the [Message Port Adapter](/docs/adapters/message-port). Before proceeding, we recommend reviewing the [Node.js Worker Thread API](https://nodejs.org/api/worker_threads.html).

## Main Thread

Listen for a `MessagePort` sent from the worker and upgrade it:

```ts
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/message-port'

const handler = new RPCHandler(router)

const worker = new Worker('some-worker.js')

worker.on('message', (message) => {
  if (message instanceof MessagePort) {
    handler.upgrade(message)
  }
})
```

## Worker Thread

Create a `MessageChannel`, send one port to the main thread, and use the other to initialize the client link:

```ts
import { MessageChannel } from 'node:worker_threads'
import { experimental_RPCLink as RPCLink } from '@orpc/client/message-port'

const { port1: clientPort, port2: serverPort } = new MessageChannel()

parentPort.postMessage(serverPort, [serverPort])

const link = new RPCLink({
  port: clientPort
})
```

:::info
This only shows how to configure the link. For full client examples, see [Client-Side Clients](/docs/client/client-side).
:::
