---
title: Client-Side Clients
description: Call your oRPC procedures remotely as if they were local functions.
---

# Client-Side Clients

Call your [procedures](/docs/procedure) remotely as if they were local functions.

## Installation

::: code-group

```sh [npm]
npm install @orpc/client@latest
```

```sh [yarn]
yarn add @orpc/client@latest
```

```sh [pnpm]
pnpm add @orpc/client@latest
```

```sh [bun]
bun add @orpc/client@latest
```

```sh [deno]
deno install npm:@orpc/client@latest
```

:::

## Creating a Client

This guide uses [RPCLink](/docs/client/rpc-link), so make sure your server is set up with [RPCHandler](/docs/rpc-handler) or any API that follows the [RPC Protocol](/docs/advanced/rpc-protocol).

```ts
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { RouterClient } from '@orpc/server'
import { ContractRouterClient } from '@orpc/contract'

const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    authorization: 'Bearer token',
  }),
  // fetch: <-- provide fetch polyfill fetch if needed
})

// Create a client for your router
const client: RouterClient<typeof router> = createORPCClient(link)
// Or, create a client using a contract
const client: ContractRouterClient<typeof contract> = createORPCClient(link)
```

:::tip
You can export `RouterClient<typeof router>` and `ContractRouterClient<typeof contract>` from server instead.
:::

## Calling Procedures

Once your client is set up, you can call your [procedures](/docs/procedure) as if they were local functions.

```ts twoslash
import { router } from './shared/planet'
import { RouterClient } from '@orpc/server'

const client = {} as RouterClient<typeof router>
// ---cut---
const planet = await client.planet.find({ id: 1 })

client.planet.create
//            ^|
```
