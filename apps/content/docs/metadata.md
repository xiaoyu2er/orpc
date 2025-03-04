---
Title: Metadata
Description: Enhance your procedures with metadata.
---

# Metadata

oRPC procedures support metadata, simple key-value pairs that provide extra information to customize behavior.

## Basic Example

```ts twoslash
import { os } from '@orpc/server'
// ---cut---
interface ORPCMetadata {
  cache?: boolean
}

const base = os
  .$meta<ORPCMetadata>({}) // [!code highlight]
  .use(async ({ procedure, next }) => {
    const result = await next()

    if (!procedure['~orpc'].meta.cache) {
      return result
    }

    // Process the result when caching is enabled

    return result
  })

const example = base
  .meta({ cache: true }) // [!code highlight]
  .handler(() => {
    // Implement your procedure logic here
  })
```

:::warning
When defining `.$meta`, oRPC requires you to pass an initial metadata.
:::
