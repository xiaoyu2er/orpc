---
title: Express.js Integration
description: Seamlessly integrate oRPC with Express.js
---

# Express.js Integration

[Express.js](https://expressjs.com/) is a popular Node.js framework for building web applications. For additional context, refer to the [Node Integration](/docs/integrations/node) guide.

## Basic

```ts
import express from 'express'
import cors from 'cors'
import { RPCHandler } from '@orpc/server/node'

const app = express()

app.use(cors())

const handler = new RPCHandler(router)

app.use('/rpc*', async (req, res, next) => {
  const { matched } = await handler.handle(req, res, {
    prefix: '/rpc',
    context: {},
  })

  if (matched) {
    return
  }

  next()
})

app.listen(3000, () => console.log('Server listening on port 3000'))
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
