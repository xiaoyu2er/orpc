---
title: OpenAPI Specification
description: Generate OpenAPI specifications for oRPC with ease.
---

# OpenAPI Specification

oRPC uses the [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0) to define APIs. It is fully compatible with [OpenAPILink](/docs/openapi/client/openapi-link) and [OpenAPIHandler](/docs/openapi/openapi-handler).

## Installation

::: code-group

```sh [npm]
npm install @orpc/openapi@latest @orpc/zod@latest
```

```sh [yarn]
yarn add @orpc/openapi@latest @orpc/zod@latest
```

```sh [pnpm]
pnpm add @orpc/openapi@latest @orpc/zod@latest
```

```sh [bun]
bun add @orpc/openapi@latest @orpc/zod@latest
```

```sh [deno]
deno install npm:@orpc/openapi@latest npm:@orpc/zod@latest
```

:::

## Generating Specifications

oRPC supports only OpenAPI 3.1.1 and uses [Zod](https://github.com/colinhacks/zod) as its sole schema library. You can generate specifications from either a [Router](/docs/router) or a [Contract](/docs/contract-first/define-contract):

:::info
Interested in [Valibot](https://valibot.dev) support? Help us prioritize this feature by casting your vote on [Github](https://github.com/unnoq/orpc/issues/162)
:::

```ts twoslash
import { contract, router } from './shared/planet'
// ---cut---
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod'

const openAPIGenerator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
})

const specFromContract = await openAPIGenerator.generate(contract, {
  info: {
    title: 'My App',
    version: '0.0.0',
  },
})

const specFromRouter = await openAPIGenerator.generate(router, {
  info: {
    title: 'My App',
    version: '0.0.0',
  },
})
```

## File Schema

In the [File Upload/Download](/docs/file-upload-download) guide, `z.instanceof` is used to describe file/blob schemas. However, this method prevents oRPC from recognizing file/blob schema. Instead, use the enhanced file schema approach:

```ts twoslash
import { z } from 'zod'
import { oz } from '@orpc/zod'

const InputSchema = z.object({
  file: oz.file(),
  image: oz.file().type('image/*'),
  blob: oz.blob()
})
```

## Extending the Specification

### Operation Metadata

You can enrich your API documentation by specifying operation metadata using the `.route` or `.tag`:

```ts
const ping = os
  .route({
    summary: 'the summary',
    description: 'the description',
    deprecated: false,
    tags: ['tag'],
    successDescription: 'the success description',
  })
  .handler(() => {})

// or append tag for entire router

const router = os.tag('planets').router({
  // ...
})
```

### Customizing Operation Objects

You can also extend the operation object using the `.spec` helper for an `error` or `middleware`:

```ts
import { oo } from '@orpc/openapi'

const base = os.errors({
  UNAUTHORIZED: oo.spec({
    data: z.any(),
  }, {
    security: [{ 'api-key': [] }],
  })
})

// OR in middleware

const requireAuth = oo.spec(
  os.middleware(async ({ next, errors }) => {
    throw new ORPCError('UNAUTHORIZED')
    return next()
  }),
  {
    security: [{ 'api-key': [] }]
  }
)
```

Any [procedure](/docs/procedure) that includes the use above `errors` or `middleware` will automatically have the defined `security` property applied

:::info
The `.spec` helper accepts a callback as its second argument, allowing you to override the entire operation object.
:::

### JSON Schema Customization

If Zod alone does not cover your JSON Schema requirements, you can extend or override the generated schema:

```ts twoslash
import { z } from 'zod'
import { oz } from '@orpc/zod'

const InputSchema = oz.openapi(
  z.object({
    name: z.string(),
  }),
  {
    examples: [
      { name: 'Earth' },
      { name: 'Mars' },
    ],
    // additional options...
  }
)
```
