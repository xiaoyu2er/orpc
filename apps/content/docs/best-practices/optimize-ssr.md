---
title: Optimize Server-Side Rendering (SSR) for Fullstack Frameworks
description: Optimize SSR performance in Next.js, SvelteKit, and other frameworks by using oRPC to make direct server-side API calls, avoiding unnecessary network requests.
---

# Optimize Server-Side Rendering (SSR) for Fullstack Frameworks

This guide demonstrates an optimized approach for setting up Server-Side Rendering (SSR) with oRPC in fullstack frameworks like Next.js, Nuxt, and SvelteKit. This method enhances performance by eliminating redundant network calls during the server rendering process.

## The Problem with Standard SSR Data Fetching

In a typical SSR setup within fullstack frameworks, data fetching often involves the server making an HTTP request back to its own API endpoints.

![Standard SSR: Server calls its own API via HTTP.](/images/standard-ssr-diagram.svg)

This pattern works, but it introduces unnecessary overhead: the server needs to make an HTTP request to itself to fetch the data, which can add extra latency and consume resources.

Ideally, during SSR, the server should fetch data by directly invoking the relevant API logic within the same process.

![Optimized SSR: Server calls API logic directly.](/images/optimized-ssr-diagram.svg)

Fortunately, oRPC provides both a [server-side client](/docs/client/server-side) and [client-side client](/docs/client/client-side), so you can leverage the former during SSR and automatically fall back to the latter in the browser.

## Conceptual approach

```ts
// Use this for server-side calls
const orpc = createRouterClient(router)

// Fallback to this for client-side calls
const orpc: RouterClient<typeof router> = createORPCClient(someLink)
```

But how? A naive `typeof window === 'undefined'` check works, but exposes your router logic to the client. We need a hack that ensures server‑only code never reaches the browser.

## Implementation

We’ll use `globalThis` to share the server client without bundling it into client code.

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
export const client: RouterClient<typeof router> = globalThis.$client ?? createORPCClient(link)
```

```ts [lib/orpc.server.ts]
'server only'

import { createRouterClient } from '@orpc/server'

globalThis.$client = createRouterClient(router, {
  context: async () => ({}), // Provide initial context if needed
})
```

:::

Finally, import `lib/orpc.server.ts` before anything else and on the **server only**. For example, in Next.js add it to `app/layout.tsx`:

```ts
import '@/lib/orpc.server'
// Rest of the code
```

Now, importing `client` from `lib/orpc.ts` gives you a server-side client during SSR and a client-side client on the client without leaking your router logic.

## Using the client

The `client` requires no special handling, just use it like regular clients.

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
This example uses Next.js, but you can apply the same pattern in SvelteKit, Nuxt, or any framework.
:::

## TanStack Query

Combining this oRPC setup with TanStack Query (React Query, Solid Query, etc.) provides a powerful pattern for data fetching, and state management, especially with Suspense hooks. Refer to these details in [Tanstack Query Integration Guide](/docs/tanstack-query/basic) and [Tanstack Query SSR Guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr).

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
Above example uses suspense hooks, you might need to wrap your app within `<Suspense />` (or corresponding APIs) to make it work. In Next.js, maybe you need create `loading.tsx`.
:::
