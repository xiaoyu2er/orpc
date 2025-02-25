---
title: Server Action
description: Integrate oRPC procedures with React Server Actions
---

# Server Action

[Server Action](https://react.dev/reference/rsc/server-functions) let client components call asynchronous server functions. With oRPC, you can make your procedures compatible by appending the `.actionable` modifier.

## Server Side

Define your procedure using `.actionable` to enable Server Action compatibility. For example:

```ts twoslash
import { onError, os } from '@orpc/server'
import { z } from 'zod'
'use server'

export const ping = os
  .input(z.object({ name: z.string() }))
  .handler(async ({ input }) => {
    return `Hello, ${input.name}`
  })
  .actionable({
    context: async () => ({}), // Provide initial context if needed
    interceptors: [
      onError((error) => {
        console.error(error)
      }),
    ]
  })
```

:::tip
When using Server Actions, we recommend [Runtime Context](/docs/context#execution-context) over [Initial Context](/docs/context#initial-context).
:::

## Client Side

On the client, simply import and call your procedure as shown below:

```tsx
'use client'

import { ping } from './actions'

export function MyComponent() {
  const [name, setName] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = await ping({ name })
    console.log(result)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  )
}
```

This approach seamlessly integrates server-side procedures with your client components using Server Actions.
