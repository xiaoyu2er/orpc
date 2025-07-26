---
title: Base64Url Helpers
description: Functions to encode and decode base64url strings, which are URL-safe variants of base64 encoding commonly used in web applications for tokens, data serialization, and API communication.
---

# Base64Url Helpers

The Base64Url helpers provide functions to encode and decode base64url strings, which are URL-safe variants of base64 encoding commonly used in web applications for tokens, data serialization, and API communication.

```ts twoslash
import { decodeBase64url, encodeBase64url } from '@orpc/server/helpers'

const originalText = 'Hello World'
const textBytes = new TextEncoder().encode(originalText)
const encodedData = encodeBase64url(textBytes)
const decodedBytes = decodeBase64url(encodedData)
const decodedText = new TextDecoder().decode(decodedBytes) // 'Hello World'
```

::: info
The `decodeBase64url` helper accepts `undefined` or `null` as input and returns `undefined` for invalid inputs, enabling seamless integration with optional data handling patterns.
:::
