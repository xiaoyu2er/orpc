---
title: OpenAPI Reference Plugin (Swagger/Scalar)
description: A plugin that serves API reference documentation and the OpenAPI specification for your API.
---

# OpenAPI Reference Plugin (Swagger/Scalar)

This plugin provides API reference documentation powered by [Scalar](https://github.com/scalar/scalar) or [Swagger UI](https://swagger.io/tools/swagger-ui/), along with the OpenAPI specification in JSON format.

::: info
This plugin relies on the [OpenAPI Generator](/docs/openapi/openapi-specification). Please review its documentation before using this plugin.
:::

## Setup

```ts
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'

const handler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [
        new ZodToJsonSchemaConverter(),
      ],
      specGenerateOptions: {
        info: {
          title: 'ORPC Playground',
          version: '1.0.0',
        },
      },
    }),
  ]
})
```

::: info
By default, the API reference client is served at the root path (`/`), and the OpenAPI specification is available at `/spec.json`. You can customize these paths by providing the `docsPath` and `specPath` options.
:::

## Using Swagger UI

To use Swagger UI instead of the default Scalar interface:

```ts
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'

const plugin = new OpenAPIReferencePlugin({
  uiType: 'swagger', // Use Swagger UI instead of Scalar
  schemaConverters: [
    new ZodToJsonSchemaConverter(),
  ],
  specGenerateOptions: {
    info: {
      title: 'ORPC Playground',
      version: '1.0.0',
    },
  },
})

const handler = new OpenAPIHandler(router, {
  plugins: [plugin]
})
```

## Configuration Options

### `uiType`

- **Type:** `'scalar' | 'swagger'`
- **Default:** `'scalar'`

Choose which UI library to use for rendering the API reference documentation.

### `docsConfig`

Pass additional configuration to the UI library:

```ts
const swaggerPlugin = new OpenAPIReferencePlugin({
  uiType: 'swagger',
  docsConfig: {
    // Swagger UI specific options
    tryItOutEnabled: true,
    deepLinking: true,
    // ... other Swagger UI options
  }
})
```

For Scalar:

```ts
const scalarPlugin = new OpenAPIReferencePlugin({
  uiType: 'scalar', // or omit (default)
  docsConfig: {
    // Scalar specific options
    hideDownloadButton: true,
    // ... other Scalar options
  }
})
```

### Custom CDN URLs

You can customize the CDN URLs for the UI libraries:

```ts
const plugin = new OpenAPIReferencePlugin({
  uiType: 'swagger',
  docsScriptUrl: 'https://your-cdn.com/swagger-ui-bundle.js',
  docsCssUrl: 'https://your-cdn.com/swagger-ui.css',
})
```
