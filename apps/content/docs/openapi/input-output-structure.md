---
title: Input/Output Structure
description: Control how input and output data is structured in oRPC
---

# Input/Output Structure

oRPC allows you to control the organization of request inputs and response outputs using the `inputStructure` and `outputStructure` options. This is especially useful when you need to handle parameters, query strings, headers, and body data separately.

## Input Structure

The `inputStructure` option defines how the incoming request data is structured. You can choose between two modes:

- **compact** (default): Merges path parameters with either the query or body data (depending on the HTTP method) into a single object.
- **detailed**: Separates the request into distinct objects for `params`, `query`, `headers`, and `body`.

### Compact Mode

```ts
const compactMode = os.route({
  path: '/ping/{name}',
  method: 'POST',
})
  .input(z.object({
    name: z.string(),
    description: z.string().optional(),
  }))
```

### Detailed Mode

```ts
const detailedMode = os.route({
  path: '/ping/{name}',
  method: 'POST',
  inputStructure: 'detailed',
})
  .input(z.object({
    params: z.object({ name: z.string() }),
    query: z.object({ search: z.string() }),
    body: z.object({ description: z.string() }).optional(),
    headers: z.object({ 'x-custom-header': z.string() }),
  }))
```

When using **detailed** mode, the input object adheres to the following structure:

```ts
export type DetailedInput = {
  params: Record<string, string> | undefined
  query: any
  body: any
  headers: Record<string, string | string[] | undefined>
}
```

Ensure your input schema matches this structure when detailed mode is enabled.

## Output Structure

The `outputStructure` option determines the format of the response data. There are two modes:

- **compact** (default): Returns only the body data directly.
- **detailed**: Returns an object with separate `headers` and `body` fields. The headers you provide are merged into the final HTTP response headers.

### Compact Mode

```ts
const compactMode = os
  .handler(async ({ input }) => {
    return { message: 'Hello, world!' }
  })
```

### Detailed Mode

```ts
const detailedMode = os
  .route({ outputStructure: 'detailed' })
  .handler(async ({ input }) => {
    return {
      headers: { 'x-custom-header': 'value' },
      body: { message: 'Hello, world!' },
    }
  })
```

When using **detailed** mode, the output object follows this structure:

```ts
export type DetailedOutput = {
  headers: Record<string, string | string[] | undefined>
  body: any
}
```

Make sure your handler’s return value matches this structure when using detailed mode.

## Default Configuration

Customize the default oRPC input/output structure settings using `.$route`:

```ts
const base = os.$route({ inputStructure: 'detailed' })
```
