---
title: Browser Extension
description: Integrate oRPC with Browser Extensions
---

# Browser Extension

Easily set up type-safe communication between scripts in your browser extension using [Message Port Adapter](/docs/adapters/message-port). Before you begin, it’s recommended to read the [Message Passing Docs](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#connect)

::: warning
The browser [Message Passing API](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) does not support transferring binary data, which means oRPC features like `File`` and Blob` cannot be used natively. However, you can temporarily work around this limitation by extending the [RPC JSON Serializer](/docs/advanced/rpc-json-serializer#extending-native-data-types) to encode `File` and `Blob` as Base64.
:::

## Server

To listen for connections on a port and upgrade the handler:

```ts
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/message-port'
import { router } from './router'

const handler = new RPCHandler(router)

browser.runtime.onConnect.addListener((port) => {
  handler.upgrade(port, {
    context: {}, // provide initial context if needed
  })
})
```

:::info
Both `browser` and `chrome` namespaces work similarly in this case. You can use whichever one you prefer.
:::

## Client

To connect to the port and create an oRPC link on the client side:

```ts
import { experimental_RPCLink as RPCLink } from '@orpc/client/message-port'

const port = browser.runtime.connect()

const link = new RPCLink({
  port,
})
```

:::info
This only shows how to configure the link. For full client examples, see [Client-Side Clients](/docs/client/client-side).
:::
