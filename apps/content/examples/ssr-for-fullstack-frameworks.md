---
title: Server-Side Rendering (SSR) Setup for Fullstack Frameworks
description: Learn how to set up SSR for your Next.js, SvelteKit, and other fullstack frameworks with oRPC.
---

# Server-Side Rendering (SSR) Setup for Fullstack Frameworks

This guide will introduce you the best way to set up SSR for your Next.js, Nuxt, SvelteKit, and other fullstack frameworks with oRPC.

## The ideas

Before we dive into the details, look at this diagram:

![Normal SSR diagram](/images/normal-ssr-diagram.svg)

This is common pattern used for SSR in fullstack frameworks. But the problem is that it's need go over the internet to call itself to fetch the data, this can consume resources and slow down the page load.

So it would be better to have a server-side rendered page that does not need to go over the internet to fetch the data, instead we call directly the API on the server (in the same server).

![Better SSR diagram](/images/better-ssr-diagram.svg)

Good news, oRPC supports both [server-side client](/docs/client/server-side) and [client-side client](/docs/client/client-side), so the ideas is we use the server-side client on Server-Side Rendering (SSR) and fallback to the client-side client on user device.

```ts
// Use this for server-side calls
const orpc = createRouterClient(router)

// Fallback to this for client-side calls
const orpc: RouterClient<typeof router> = createORPCClient(someLink)
```

But how? In the theory it simple just if/else base on `typeof window === 'undefined'`? No not simple like that, because we don't want leak entire business logic inside `router` to the client, so we need hack-around it.

## The solution

Luckly in js we have `globalThis` variable, that can help we can communicate between each other, without actually import anything.

So we need two files like this:

::: code-group

```ts [lib/orpc.ts]
import type { RouterClient } from '@orpc/server'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCClient } from '@orpc/client'

declare global {
  var $client: RouterClient<typeof router> | undefined
}

const link = new RPCLink({
  url: new URL('/rpc', typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'),
})

/**
 * Fallback to client-side client if server-side client is not available.
 */
export const client: RouterClient<typeof router> = globalThis.$orpc ?? createORPCClient(link)
```

```ts [lib/orpc.server.ts]
'server only'

import { createRouterClient } from '@orpc/server'

globalThis.$client = createRouterClient(router, {
  context: async () => ({}), // Provide initial context if needed
})
```

:::

Now the only step we need is import `lib/orpc.server.ts` on root project, to make sure this run first.
For example If you are using Next.js, you can add this to `app/layout.tsx`:

```ts
import '@/lib/orpc.server'
// Rest of the code
```

Now when you import `orpc` from `lib/orpc.ts`, it will be server-side client on server and client-side client on client. without leak business logic to client.

## Usage

The usage have no special, just use orpc like regular the rest automatically handled.

```tsx
export default async function PlanetListPage() {
  const planets = await client.planet.list({ limit: 10 })

  return (
    <div>
      {planets.map(planet => (
        <div key={planet.id}>{planet.name}</div>
      ))}
    </div>
  )
}
```

::: info
This example is for Next.js, but you can use it with any framework.
:::

## TanStack Query

Tanstack query have some APIs like `useSuspenseQuery` and `useSuspenseInfiniteQuery` that works with `<Suspense />` in React, when combine with above orpc client, it can be great combo for SSR without any extra effort. Refer this details in [Tanstack Query Integration Guide](/docs/tanstack-query/basic).

::: info
Not stop from React, you can do this with any framework that both oRPC and TanStack Query support if your framework support `<Suspense />` API or a corresponding mechanism.
:::

:::info
I recommend you read [Tanstack Query SSR Guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr), seem it not cover the new suspense query, but still valuable for setup `<QueryClientProvider />`
:::

```tsx
export default function PlanetListPage() {
  const { data: planets } = useSuspenseQuery(
    orpc.planet.list.queryOptions({
      input: { limit: 10 },
    }),
  )

  return (
    <div>
      {planets.map(planet => (
        <div key={planet.id}>{planet.name}</div>
      ))}
    </div>
  )
}
```

:::warning
You might need wrap your app with `<Suspense />` (or corresponding APIs) to make it work. In Next.js maybe you need create `loading.tsx` to make it work.
:::
