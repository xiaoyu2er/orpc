---
title: GET Method Guard Plugin
description: Enhance security by restricting GET requests to explicitly allowed procedures, mitigating Cross-Site Request Forgery (CSRF) risks.
---

# GET Method Guard Plugin

This plugin enhances security by ensuring only procedures explicitly marked to accept `GET` requests can be called using the HTTP `GET` method for [RPC Protocol](/docs/advanced/rpc-protocol). This helps prevent certain types of [Cross-Site Request Forgery (CSRF)](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSRF_prevention) attacks.

## When to Use

This plugin is beneficial if your application stores sensitive data (like session or auth tokens) in Cookie storage using `SameSite=Lax` (the default) or `SameSite=None`.

## How it works

The plugin enforces a simple rule: only procedures explicitly configured with `method: 'GET'` can be invoked via a `GET` request. All other procedures will reject `GET` requests.

```ts
import { os } from '@orpc/server'

const ping = os
  .route({ method: 'GET' }) // [!code highlight]
  .handler(() => 'pong')
```

## Setup

```ts twoslash
import { RPCHandler } from '@orpc/server/fetch'
import { router } from './shared/planet'
// ---cut---
import { GetMethodGuardPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [
    new GetMethodGuardPlugin()
  ],
})
```
