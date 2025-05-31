---
title: Tanstack Query Integration
description: Seamlessly integrate oRPC with Tanstack Query
---

# Tanstack Query Integration

[Tanstack Query](https://tanstack.com/query/latest) is a robust solution for asynchronous state management. oRPC Tanstack Query integration is very lightweight and straightforward - supporting all libraries that Tanstack Query supports (React, Vue, Angular, Solid, Svelte, etc.).

::: warning
This documentation assumes you are already familiar with [Tanstack Query](https://tanstack.com/query/latest). If you need a refresher, please review the official Tanstack Query documentation before proceeding.
:::

## Installation

::: code-group

```sh [npm]
npm install @orpc/tanstack-query@latest
```

```sh [yarn]
yarn add @orpc/tanstack-query@latest
```

```sh [pnpm]
pnpm add @orpc/tanstack-query@latest
```

```sh [bun]
bun add @orpc/tanstack-query@latest
```

```sh [deno]
deno install npm:@orpc/tanstack-query@latest
```

:::

## Setup

Before you begin, ensure you have already configured a [server-side client](/docs/client/server-side) or a [client-side client](/docs/client/client-side).

```ts twoslash
import { router } from './shared/planet'
import { RouterClient } from '@orpc/server'
declare const client: RouterClient<typeof router>
// ---cut---
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

export const orpc = createTanstackQueryUtils(client)

orpc.planet.find.queryOptions({ input: { id: 123 } })
//               ^|

//

//

//
```

::: details Avoiding Query/Mutation Key Conflicts?

You can easily avoid key conflicts by passing a unique base key when creating your utils:

```ts
const userORPC = createTanstackQueryUtils(userClient, {
  path: ['user']
})

const postORPC = createTanstackQueryUtils(postClient, {
  path: ['post']
})
```

:::

## Query Options

Use `.queryOptions` to configure queries. Use it with hooks like `useQuery`, `useSuspenseQuery`, or `prefetchQuery`.

```ts
const query = useQuery(orpc.planet.find.queryOptions({
  input: { id: 123 }, // Specify input if needed
  context: { cache: true }, // Provide client context if needed
  // additional options...
}))
```

## Streamed Query Options

Use `.streamedOptions` to configure queries for [Event Iterator](/docs/event-iterator), which is built on top of [streamedQuery](https://tanstack.com/query/latest/docs/reference/streamedQuery). Use it with hooks like `useQuery`, `useSuspenseQuery`, or `prefetchQuery`.

```ts
const query = useQuery(orpc.streamed.experimental_streamedOptions({
  input: { id: 123 }, // Specify input if needed
  context: { cache: true }, // Provide client context if needed
  queryFnOptions: { // Specify streamedQuery options if needed
    refetchMode: 'reset',
    maxChunks: 3,
  }
  // additional options...
}))
```

## Infinite Query Options

Use `.infiniteOptions` to configure infinite queries. Use it with hooks like `useInfiniteQuery`, `useSuspenseInfiniteQuery`, or `prefetchInfiniteQuery`.

::: info
The `input` parameter must be a function that accepts the page parameter and returns the query input. Be sure to define the type for `pageParam` if it can be `null` or `undefined`.
:::

```ts
const query = useInfiniteQuery(orpc.planet.list.infiniteOptions({
  input: (pageParam: number | undefined) => ({ limit: 10, offset: pageParam }),
  context: { cache: true }, // Provide client context if needed
  initialPageParam: undefined,
  getNextPageParam: lastPage => lastPage.nextPageParam,
  // additional options...
}))
```

## Mutation Options

Use `.mutationOptions` to create options for mutations. Use it with hooks like `useMutation`.

```ts
const mutation = useMutation(orpc.planet.create.mutationOptions({
  context: { cache: true }, // Provide client context if needed
  // additional options...
}))

mutation.mutate({ name: 'Earth' })
```

## Query/Mutation Key

Use `.key` to generate a `QueryKey` or `MutationKey`. This is useful for tasks such as revalidating queries, checking mutation status, etc.

::: warning
For exact key matching (e.g. setting or updating specific query data), you should use methods like `.queryOptions(...).queryKey`, `.infiniteOptions(...).queryKey`, etc.
:::

```ts
const queryClient = useQueryClient()

// Invalidate all planet queries
queryClient.invalidateQueries({
  queryKey: orpc.planet.key(),
})

// Invalidate only regular (non-infinite) planet queries
queryClient.invalidateQueries({
  queryKey: orpc.planet.key({ type: 'query' })
})

// Invalidate the planet find query with id 123
queryClient.invalidateQueries({
  queryKey: orpc.planet.find.key({ input: { id: 123 } })
})
```

## Calling Clients

Use `.call` to call a procedure client directly. It's an alias for corresponding procedure client.

```ts
const planet = await orpc.planet.find.call({ id: 123 })
```

## Reactive Options

In reactive libraries like Vue or Solid, **TanStack Query** supports passing computed values as options. The exact usage varies by framework, so refer to the [Tanstack Query documentation](https://tanstack.com/query/latest/docs/guides/reactive-options) for details.

::: code-group

```ts [Options as Function]
const query = useQuery(
  () => orpc.planet.find.queryOptions({
    input: { id: id() },
  })
)
```

```ts [Computed Options]
const query = useQuery(computed(
  () => orpc.planet.find.queryOptions({
    input: { id: id.value },
  })
))
```

:::

## Error Handling

Easily manage type-safe errors using our built-in `isDefinedError` helper.

```ts
import { isDefinedError } from '@orpc/client'

const mutation = useMutation(orpc.planet.create.mutationOptions({
  onError: (error) => {
    if (isDefinedError(error)) {
      // Handle type-safe error here
    }
  }
}))

mutation.mutate({ name: 'Earth' })

if (mutation.error && isDefinedError(mutation.error)) {
  // Handle the error here
}
```

::: info
For more details, see our [type-safe error handling guide](/docs/error-handling#type‐safe-error-handling).
:::

## `skipToken` for Disabling Queries

The `skipToken` symbol offers a type-safe alternative to the `disabled` option when you need to conditionally disable a query by omitting its `input`.

```ts
const query = useQuery(
  orpc.planet.list.queryOptions({
    input: search ? { search } : skipToken, // [!code highlight]
  })
)

const query = useInfiniteQuery(
  orpc.planet.list.infiniteOptions({
    input: search // [!code highlight]
      ? (offset: number | undefined) => ({ limit: 10, offset, search }) // [!code highlight]
      : skipToken, // [!code highlight]
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.nextPageParam,
  })
)
```

## Operation Context

When clients are invoked through the TanStack Query integration, an **operation context** is automatically added to the [client context](/docs/client/rpc-link#using-client-context). This context can be used to config the request behavior, like setting the HTTP method.

```ts
import {
  TANSTACK_QUERY_OPERATION_CONTEXT_SYMBOL,
  TanstackQueryOperationContext,
} from '@orpc/tanstack-query'

interface ClientContext extends TanstackQueryOperationContext {
}

const link = new RPCLink<ClientContext>({
  url: 'http://localhost:3000/rpc',
  method: ({ context }, path) => {
    const operationType = context[TANSTACK_QUERY_OPERATION_CONTEXT_SYMBOL]?.type

    if (operationType === 'query' || operationType === 'streamed' || operationType === 'infinite') {
      return 'GET'
    }

    return 'POST'
  },
})
```
