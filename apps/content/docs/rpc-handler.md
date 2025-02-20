---
title: RPC Handler
description: Comprehensive Guide to the RPCHandler in oRPC
---

# RPC Handler

The `RPCHandler` is the central component of oRPC's server-side API. It handles communication with clients over oRPC's proprietary RPC protocol—which is built on top of HTTP.
Although it efficiently transfers native types, its protocol is neither human-friendly nor compatible with the OpenAPI standard.
If you need an interface that adheres to OpenAPI, please refer to the [OpenAPIHandler](/docs/openapi/openapi-handler).

:::warning
The `RPCHandler` is designed exclusively for use with [RPCLink](/docs/client/rpc-link) and does not support
the OpenAPI standard. **Do not** manually send requests directly to the `RPCHandler`.
:::

## Supported Data Types

`RPCHandler` can natively serialize and deserialize the following JavaScript types:

- **string**
- **number** (including `NaN`)
- **boolean**
- **null**
- **undefined**
- **Date** (including `Invalid Date`)
- **BigInt**
- **RegExp**
- **URL**
- **Set**
- **Map**
- **Blob**
- **File**
- **AsyncIteratorObject** (root-level only; powers [Event Iterator](/docs/event-iterator))

## Setup and Integration

The following example shows how to initialize the `RPCHandler` in your server code.
In this example, we configure the handler with a router, set up a CORS plugin, and attach an error interceptor.

```ts
import { ORPCHandler } from '@orpc/server/fetch' // or '@orpc/server/node'
import { CORSPlugin } from '@orpc/server/plugins'
import { onError } from '@orpc/server'

const handler = new ORPCHandler(router, {
  plugins: [
    new CORSPlugin()
  ],
  interceptors: [
    onError((error) => {
      console.error(error)
    })
  ],
})

export default async function fetch(request: Request) {
  const url = new URL(request.url)
  if (url.pathname === '/rpc') {
    const result = await handler.handle(request, {
      prefix: '/rpc',
      context: {
        // Provide any initial context here, if required
      }
    })

    if (result.matched) {
      return result.response
    }
  }

  return new Response('Not Found', { status: 404 })
}
```
