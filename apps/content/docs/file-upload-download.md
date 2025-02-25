---
title: File Upload and Download
description: Learn how to upload and download files using oRPC.
---

# File Operations in oRPC

oRPC natively supports file uploads and downloads using standard [File](https://developer.mozilla.org/en-US/docs/Web/API/File) and [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, requiring no additional configuration.

:::tip
For files larger than 10MB, it is recommended to use a dedicated solution for performance and reliability.
:::

## Validation

oRPC uses the standard [File](https://developer.mozilla.org/en-US/docs/Web/API/File) and [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects to handle file operations. To validate file uploads and downloads, you can use the `z.instanceof(File)` and `z.instanceof(Blob)` validators, or equivalent schemas in libraries like Valibot or Arktype.

```ts twoslash
import { os } from '@orpc/server'
import { z } from 'zod'
// ---cut---
const example = os
  .input(z.object({ file: z.instanceof(File) }))
  .output(z.object({ file: z.instanceof(File) }))
  .handler(async ({ input }) => {
    console.log(input.file.name)
    return { file: input.file }
  })
```

:::info
If you are using Node.js 18, you can import the `File` class from the `buffer` module.
:::
