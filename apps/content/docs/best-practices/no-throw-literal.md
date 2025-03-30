---
title: No Throw Literal
description: Always throw `Error` instances instead of literal values.
---

# No Throw Literal

JavaScript allows you to throw any value, but best practices dictate throwing only `Error` instances rather than literal values.

```ts
// eslint-disable-next-line no-throw-literal
throw 'error' // ✗ avoid
throw new Error('error') // ✓ recommended
```

:::info
By default, oRPC treats thrown instances of `Error` as best practice. This approach is also recommended by the [JavaScript Standard Style](https://standardjs.com/rules.html#throw-new-error-old-style).
:::

## Configuration

You can customize oRPC's default behavior by setting `throwableError` in the `Registry`:

```ts twoslash
declare module '@orpc/server' { // or '@orpc/contract', or '@orpc/client'
  interface Registry {
    throwableError: Error // [!code highlight]
  }
}
```

:::info
Set `throwableError` to either `Error` (the default) or `null | undefined | {}` (which is equivalent to `unknown` and works with [type-safe error handling](/docs/client/error-handling#using-safe-and-isdefinederror)).
:::

:::tip
If you configure it as `null | undefined | {}`, you must adjust your code. Instead of simply checking for an error, use the `status` property:

```ts
const { error, data, status } = await safe(client('input'))

if (status === 'error') {
  if (isDefinedError(error)) {
    // handle type-safe error
  }

  // handle other errors
}
else {
  // handle success
}
```

:::

## Bonus

If you use ESLint, enable the [no-throw-literal](https://eslint.org/docs/rules/no-throw-literal) rule to enforce throwing only `Error` instances.
